import { Router } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { foodLog, foods, weightLog, tdeeHistory, dailyIntake } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateDateParam } from '../validation/schemas.js';
import { calculateTdeeHistory } from '../services/tdee.js';
import { getComputedCalorieTarget } from '../services/calorieTarget.js';

const router = Router();

function daysAgo(days: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0]!;
}

// GET /api/dashboard?date=YYYY-MM-DD
// Returns all data needed for DashboardView in a single response
router.get('/', async (req, res, next) => {
  try {
    const date = validateDateParam(req.query.date, 'date');

    const user = req.user;
    const userId = req.userId;
    const fromDate7 = daysAgo(7);
    const smoothing = Number(user.tdeeSmoothingFactor) || 0.1;

    // Run all queries in parallel
    const [logEntries, todayWeight, tdeeHistoryData, intakeImported, computedCalorieTarget] = await Promise.all([
      // Food log for the given date
      db.select({
        id: foodLog.id,
        foodId: foodLog.foodId,
        date: foodLog.date,
        timeHour: foodLog.timeHour,
        servings: foodLog.servings,
        createdAt: foodLog.createdAt,
        food: {
          id: foods.id,
          name: foods.name,
          emoji: foods.emoji,
          category: foods.category,
          servingLabel: foods.servingLabel,
          calories: foods.calories,
          protein: foods.protein,
          fat: foods.fat,
          carbs: foods.carbs,
        },
      })
        .from(foodLog)
        .innerJoin(foods, eq(foodLog.foodId, foods.id))
        .where(and(eq(foodLog.userId, userId), eq(foodLog.date, date)))
        .orderBy(foodLog.timeHour, foodLog.createdAt),

      // Today's weight
      db.select()
        .from(weightLog)
        .where(and(eq(weightLog.userId, userId), gte(weightLog.date, date), lte(weightLog.date, date)))
        .orderBy(weightLog.date),

      // TDEE history (last 7 days)
      db.select()
        .from(tdeeHistory)
        .where(and(eq(tdeeHistory.userId, userId), gte(tdeeHistory.date, fromDate7)))
        .orderBy(tdeeHistory.date),

      // Daily intake (last 7 days)
      db.select()
        .from(dailyIntake)
        .where(and(eq(dailyIntake.userId, userId), gte(dailyIntake.date, fromDate7)))
        .orderBy(dailyIntake.date),

      // Computed calorie target (only needs user, runs in parallel)
      getComputedCalorieTarget(user),
    ]);

    // Format TDEE data
    let tdeeData;
    if (tdeeHistoryData.length > 0) {
      tdeeData = tdeeHistoryData.map(h => ({
        date: h.date,
        tdeeEstimate: Number(h.tdeeEstimate),
        caloriesConsumed: Number(h.caloriesConsumed),
      }));
    } else {
      // Calculate from raw data if no pre-computed history
      const weights = await db.select()
        .from(weightLog)
        .where(and(eq(weightLog.userId, userId), gte(weightLog.date, fromDate7)))
        .orderBy(weightLog.date);

      const weightMap = new Map(weights.map(w => [w.date, Number(w.weight)]));
      const dataPoints = intakeImported
        .filter(i => weightMap.has(i.date))
        .map(i => ({
          date: i.date,
          weight: weightMap.get(i.date)!,
          calories: Number(i.calories),
        }));
      tdeeData = calculateTdeeHistory(dataPoints, smoothing);
    }

    // Format intake data
    let intakeData;
    if (intakeImported.length > 0) {
      intakeData = intakeImported.map(i => ({
        date: i.date,
        calories: Number(i.calories),
        protein: Number(i.protein),
        fat: Number(i.fat),
        carbs: Number(i.carbs),
      }));
    } else {
      // Aggregate from food_log for the last 7 days
      const recentLog = await db
        .select({ date: foodLog.date, servings: foodLog.servings, calories: foods.calories })
        .from(foodLog)
        .innerJoin(foods, eq(foodLog.foodId, foods.id))
        .where(and(eq(foodLog.userId, userId), gte(foodLog.date, fromDate7)))
        .orderBy(foodLog.date);

      const byDate = new Map<string, { calories: number; protein: number; fat: number; carbs: number }>();
      for (const e of recentLog) {
        const s = Number(e.servings) || 1;
        const cal = (Number(e.calories) || 0) * s;
        const existing = byDate.get(e.date) ?? { calories: 0, protein: 0, fat: 0, carbs: 0 };
        existing.calories += cal;
        byDate.set(e.date, existing);
      }

      intakeData = Array.from(byDate.entries()).map(([d, t]) => ({
        date: d,
        calories: Math.round(t.calories * 10) / 10,
        protein: 0,
        fat: 0,
        carbs: 0,
      }));
    }

    res.json({
      log: logEntries,
      user,
      todayWeight,
      tdee: tdeeData,
      intake: intakeData,
      computedCalorieTarget,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
