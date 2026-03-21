import { db } from '../db/connection.js';
import { users, foods, foodLog, weightLog, dailyIntake } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import { invalidateUserCache } from '../middleware/userMiddleware.js';

interface ImportDataSummary {
  userUpdated: boolean;
  foodsInserted: number;
  foodsSkipped: number;
  foodLogInserted: number;
  foodLogSkipped: number;
  weightInserted: number;
  weightUpdated: number;
  importedIntakeDays: number;
}

const MAX_FOODS = 5000;
const MAX_FOOD_LOG = 50000;
const MAX_WEIGHT = 5000;

export async function importData(
  jsonData: unknown,
  userId: string,
): Promise<ImportDataSummary> {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new AppError(400, 'Invalid export file: not a JSON object');
  }

  const data = jsonData as Record<string, unknown>;

  if (data.version !== 1) {
    throw new AppError(400, 'Unsupported export version. Expected version 1.');
  }
  if (data.appName !== 'food-tracker') {
    throw new AppError(400, 'Invalid export file: not a food-tracker export');
  }
  if (!Array.isArray(data.foods)) {
    throw new AppError(400, 'Invalid export file: missing foods array');
  }
  if (!Array.isArray(data.foodLog)) {
    throw new AppError(400, 'Invalid export file: missing foodLog array');
  }
  if (!Array.isArray(data.weightLog)) {
    throw new AppError(400, 'Invalid export file: missing weightLog array');
  }

  if (data.foods.length > MAX_FOODS) {
    throw new AppError(400, `Foods array exceeds ${MAX_FOODS} limit`);
  }
  if (data.foodLog.length > MAX_FOOD_LOG) {
    throw new AppError(400, `Food log array exceeds ${MAX_FOOD_LOG} limit`);
  }
  if (data.weightLog.length > MAX_WEIGHT) {
    throw new AppError(400, `Weight log array exceeds ${MAX_WEIGHT} limit`);
  }

  const summary: ImportDataSummary = {
    userUpdated: false,
    foodsInserted: 0,
    foodsSkipped: 0,
    foodLogInserted: 0,
    foodLogSkipped: 0,
    weightInserted: 0,
    weightUpdated: 0,
    importedIntakeDays: 0,
  };

  await db.transaction(async (tx) => {
    // ── Update user profile ──
    const userProfile = data.user as Record<string, unknown> | undefined;
    if (userProfile && typeof userProfile === 'object') {
      const updates: Record<string, unknown> = {};
      if (userProfile.age != null) updates.age = Number(userProfile.age);
      if (userProfile.sex != null) updates.sex = userProfile.sex;
      if (userProfile.heightInches != null) updates.heightInches = String(userProfile.heightInches);
      if (userProfile.currentWeight != null) updates.currentWeight = String(userProfile.currentWeight);
      if (userProfile.objective != null) updates.objective = userProfile.objective;
      if (userProfile.activityLevel != null) updates.activityLevel = String(userProfile.activityLevel);
      if (userProfile.goalPace != null) updates.goalPace = Number(userProfile.goalPace);
      if (userProfile.proteinTarget != null) updates.proteinTarget = Number(userProfile.proteinTarget);
      if (userProfile.fatTarget != null) updates.fatTarget = Number(userProfile.fatTarget);
      if (userProfile.carbTarget != null) updates.carbTarget = Number(userProfile.carbTarget);
      if (userProfile.tdeeSmoothingFactor != null) updates.tdeeSmoothingFactor = String(userProfile.tdeeSmoothingFactor);
      if (userProfile.categoryConfig != null) updates.categoryConfig = userProfile.categoryConfig;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await tx.update(users).set(updates).where(eq(users.id, userId));
        invalidateUserCache();
        summary.userUpdated = true;
      }
    }

    // ── Insert foods, build exportId → newDbId map ──
    const exportIdToDbId = new Map<number, string>();
    const foodNameCategoryToDbId = new Map<string, string>();

    for (const raw of data.foods as Record<string, unknown>[]) {
      const name = String(raw.name ?? '').trim();
      if (!name) continue;

      const category = String(raw.category ?? 'favorites');
      const key = `${name}::${category}`;

      // Check for existing food
      const existing = await tx
        .select({ id: foods.id })
        .from(foods)
        .where(and(eq(foods.userId, userId), eq(foods.name, name), eq(foods.category, category)))
        .limit(1);

      if (existing.length > 0) {
        summary.foodsSkipped++;
        const existingId = existing[0]!.id;
        if (raw._exportId != null) exportIdToDbId.set(Number(raw._exportId), existingId);
        foodNameCategoryToDbId.set(key, existingId);
        continue;
      }

      const [inserted] = await tx.insert(foods).values({
        userId,
        name,
        emoji: raw.emoji ? String(raw.emoji) : null,
        category,
        servingLabel: raw.servingLabel ? String(raw.servingLabel) : null,
        servingGrams: raw.servingGrams != null ? String(raw.servingGrams) : null,
        calories: raw.calories != null ? String(raw.calories) : null,
        protein: raw.protein != null ? String(raw.protein) : null,
        fat: raw.fat != null ? String(raw.fat) : null,
        carbs: raw.carbs != null ? String(raw.carbs) : null,
        source: (['manual', 'imported_favorite', 'imported_history'].includes(String(raw.source))
          ? String(raw.source) as 'manual' | 'imported_favorite' | 'imported_history'
          : 'manual'),
      }).returning({ id: foods.id });

      const newId = inserted!.id;
      if (raw._exportId != null) exportIdToDbId.set(Number(raw._exportId), newId);
      foodNameCategoryToDbId.set(key, newId);
      summary.foodsInserted++;
    }

    // ── Insert food log entries ──
    for (const raw of data.foodLog as Record<string, unknown>[]) {
      const date = String(raw.date ?? '');
      if (!date) continue;

      // Resolve food ID from exportId or by name lookup
      let foodId: string | undefined;
      if (raw.foodExportId != null) {
        foodId = exportIdToDbId.get(Number(raw.foodExportId));
      }
      if (!foodId && raw.foodName) {
        // Try to find by name in our map (check all categories)
        for (const [key, id] of foodNameCategoryToDbId) {
          if (key.startsWith(`${String(raw.foodName)}::`)) {
            foodId = id;
            break;
          }
        }
      }
      if (!foodId) {
        summary.foodLogSkipped++;
        continue;
      }

      const timeHour = Number(raw.timeHour ?? 12);
      const servings = String(raw.servings ?? 1);

      // Check for duplicate
      const existing = await tx
        .select({ id: foodLog.id })
        .from(foodLog)
        .where(and(
          eq(foodLog.userId, userId),
          eq(foodLog.date, date),
          eq(foodLog.timeHour, timeHour),
          eq(foodLog.foodId, foodId),
        ))
        .limit(1);

      if (existing.length > 0) {
        summary.foodLogSkipped++;
        continue;
      }

      await tx.insert(foodLog).values({
        userId,
        foodId,
        date,
        timeHour,
        servings,
      });
      summary.foodLogInserted++;
    }

    // ── Insert weight log entries (upsert by date) ──
    for (const raw of data.weightLog as Record<string, unknown>[]) {
      const date = String(raw.date ?? '');
      const weight = Number(raw.weight);
      if (!date || !weight) continue;

      const existing = await tx
        .select({ id: weightLog.id })
        .from(weightLog)
        .where(and(eq(weightLog.userId, userId), eq(weightLog.date, date)))
        .limit(1);

      if (existing.length > 0) {
        await tx.update(weightLog)
          .set({ weight: String(weight) })
          .where(eq(weightLog.id, existing[0]!.id));
        summary.weightUpdated++;
      } else {
        await tx.insert(weightLog).values({
          userId,
          date,
          weight: String(weight),
        });
        summary.weightInserted++;
      }
    }

    // ── Import dailyIntake with source='imported' only ──
    const intakeArr = Array.isArray(data.dailyIntake) ? data.dailyIntake as Record<string, unknown>[] : [];
    for (const raw of intakeArr) {
      if (raw.source !== 'imported') continue;

      const date = String(raw.date ?? '');
      if (!date) continue;

      const existing = await tx
        .select({ id: dailyIntake.id })
        .from(dailyIntake)
        .where(and(eq(dailyIntake.userId, userId), eq(dailyIntake.date, date)))
        .limit(1);

      if (existing.length > 0) continue;

      await tx.insert(dailyIntake).values({
        userId,
        date,
        calories: String(raw.calories ?? 0),
        protein: String(raw.protein ?? 0),
        fat: String(raw.fat ?? 0),
        carbs: String(raw.carbs ?? 0),
        source: 'imported',
      });
      summary.importedIntakeDays++;
    }
  });

  return summary;
}
