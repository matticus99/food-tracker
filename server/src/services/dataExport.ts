import { db } from '../db/connection.js';
import { users, foods, foodLog, weightLog, dailyIntake, tdeeHistory } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface ExportData {
  version: number;
  exportedAt: string;
  appName: string;
  user: Record<string, unknown>;
  foods: Record<string, unknown>[];
  foodLog: Record<string, unknown>[];
  weightLog: Record<string, unknown>[];
  dailyIntake: Record<string, unknown>[];
  tdeeHistory: Record<string, unknown>[];
}

function toNum(val: string | null | undefined): number | null {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export async function exportData(userId: string): Promise<ExportData> {
  const [userRows, foodRows, logRows, weightRows, intakeRows, tdeeRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db.select().from(foods).where(eq(foods.userId, userId)),
    db.select({
      id: foodLog.id,
      foodId: foodLog.foodId,
      date: foodLog.date,
      timeHour: foodLog.timeHour,
      servings: foodLog.servings,
      foodName: foods.name,
    }).from(foodLog)
      .innerJoin(foods, eq(foodLog.foodId, foods.id))
      .where(eq(foodLog.userId, userId)),
    db.select().from(weightLog).where(eq(weightLog.userId, userId)),
    db.select().from(dailyIntake).where(eq(dailyIntake.userId, userId)),
    db.select().from(tdeeHistory).where(eq(tdeeHistory.userId, userId)),
  ]);

  const user = userRows[0];
  if (!user) throw new Error('User not found');

  // Build food id → exportId map
  const foodIdToExportId = new Map<string, number>();
  foodRows.forEach((f, i) => foodIdToExportId.set(f.id, i + 1));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'food-tracker',
    user: {
      age: user.age,
      sex: user.sex,
      heightInches: toNum(user.heightInches),
      currentWeight: toNum(user.currentWeight),
      objective: user.objective,
      activityLevel: toNum(user.activityLevel),
      goalPace: user.goalPace,
      proteinTarget: user.proteinTarget,
      fatTarget: user.fatTarget,
      carbTarget: user.carbTarget,
      tdeeSmoothingFactor: toNum(user.tdeeSmoothingFactor),
      categoryConfig: user.categoryConfig,
    },
    foods: foodRows.map((f) => ({
      _exportId: foodIdToExportId.get(f.id),
      name: f.name,
      emoji: f.emoji,
      category: f.category,
      servingLabel: f.servingLabel,
      servingGrams: toNum(f.servingGrams),
      calories: toNum(f.calories),
      protein: toNum(f.protein),
      fat: toNum(f.fat),
      carbs: toNum(f.carbs),
      source: f.source,
    })),
    foodLog: logRows.map((l) => ({
      date: l.date,
      timeHour: l.timeHour,
      servings: toNum(l.servings),
      foodExportId: foodIdToExportId.get(l.foodId) ?? null,
      foodName: l.foodName,
    })),
    weightLog: weightRows.map((w) => ({
      date: w.date,
      weight: toNum(w.weight),
    })),
    dailyIntake: intakeRows.map((d) => ({
      date: d.date,
      calories: toNum(d.calories),
      protein: toNum(d.protein),
      fat: toNum(d.fat),
      carbs: toNum(d.carbs),
      source: d.source,
    })),
    tdeeHistory: tdeeRows.map((t) => ({
      date: t.date,
      tdeeEstimate: toNum(t.tdeeEstimate),
      caloriesConsumed: toNum(t.caloriesConsumed),
      weightUsed: toNum(t.weightUsed),
    })),
  };
}
