import { Router } from 'express';
import { eq, and, gte, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users, weightLog, dailyIntake, foodLog, foods, tdeeHistory } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateTdeeHistory, calculateBMR, smoothWeightTrend } from '../services/tdee.js';

const router = Router();

async function getUser() {
  const [user] = await db.select().from(users).limit(1);
  if (!user) throw new AppError(404, 'No user found');
  return user;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0]!;
}

// GET /api/analytics/tdee?days=14
router.get('/tdee', async (req, res, next) => {
  try {
    const user = await getUser();
    const days = parseInt(req.query.days as string) || 14;
    const fromDate = daysAgo(days);

    // First try to get from tdee_history (imported or previously calculated)
    const history = await db
      .select()
      .from(tdeeHistory)
      .where(and(eq(tdeeHistory.userId, user.id), gte(tdeeHistory.date, fromDate)))
      .orderBy(tdeeHistory.date);

    if (history.length > 0) {
      res.json(history.map(h => ({
        date: h.date,
        tdeeEstimate: Number(h.tdeeEstimate),
        caloriesConsumed: Number(h.caloriesConsumed),
        weightUsed: h.weightUsed ? Number(h.weightUsed) : null,
      })));
      return;
    }

    // Otherwise calculate from weight + intake data
    const weights = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, user.id), gte(weightLog.date, fromDate)))
      .orderBy(weightLog.date);

    const intakes = await db
      .select()
      .from(dailyIntake)
      .where(and(eq(dailyIntake.userId, user.id), gte(dailyIntake.date, fromDate)))
      .orderBy(dailyIntake.date);

    // Merge weight + intake by date
    const weightMap = new Map(weights.map(w => [w.date, Number(w.weight)]));
    const dataPoints = intakes
      .filter(i => weightMap.has(i.date))
      .map(i => ({
        date: i.date,
        weight: weightMap.get(i.date)!,
        calories: Number(i.calories),
      }));

    const smoothing = Number(user.tdeeSmoothingFactor) || 0.1;
    const results = calculateTdeeHistory(dataPoints, smoothing);

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/weight-trend?days=14
router.get('/weight-trend', async (req, res, next) => {
  try {
    const user = await getUser();
    const days = parseInt(req.query.days as string) || 14;
    const fromDate = daysAgo(days);

    const weights = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, user.id), gte(weightLog.date, fromDate)))
      .orderBy(weightLog.date);

    const smoothing = Number(user.tdeeSmoothingFactor) || 0.1;
    const trend = smoothWeightTrend(
      weights.map(w => ({ date: w.date, weight: Number(w.weight) })),
      smoothing,
    );

    res.json(trend);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/daily-intake?days=7
router.get('/daily-intake', async (req, res, next) => {
  try {
    const user = await getUser();
    const days = parseInt(req.query.days as string) || 7;
    const fromDate = daysAgo(days);

    // Try daily_intake table first (imported data)
    const imported = await db
      .select()
      .from(dailyIntake)
      .where(and(eq(dailyIntake.userId, user.id), gte(dailyIntake.date, fromDate)))
      .orderBy(dailyIntake.date);

    if (imported.length > 0) {
      res.json(imported.map(i => ({
        date: i.date,
        calories: Number(i.calories),
        protein: Number(i.protein),
        fat: Number(i.fat),
        carbs: Number(i.carbs),
        source: i.source,
      })));
      return;
    }

    // Otherwise aggregate from food_log
    const logEntries = await db
      .select({
        date: foodLog.date,
        servings: foodLog.servings,
        calories: foods.calories,
        protein: foods.protein,
        fat: foods.fat,
        carbs: foods.carbs,
      })
      .from(foodLog)
      .innerJoin(foods, eq(foodLog.foodId, foods.id))
      .where(and(eq(foodLog.userId, user.id), gte(foodLog.date, fromDate)))
      .orderBy(foodLog.date);

    // Group by date
    const byDate = new Map<string, { calories: number; protein: number; fat: number; carbs: number }>();
    for (const entry of logEntries) {
      const s = Number(entry.servings) || 1;
      const existing = byDate.get(entry.date) ?? { calories: 0, protein: 0, fat: 0, carbs: 0 };
      existing.calories += (Number(entry.calories) || 0) * s;
      existing.protein += (Number(entry.protein) || 0) * s;
      existing.fat += (Number(entry.fat) || 0) * s;
      existing.carbs += (Number(entry.carbs) || 0) * s;
      byDate.set(entry.date, existing);
    }

    const result = Array.from(byDate.entries()).map(([date, totals]) => ({
      date,
      calories: Math.round(totals.calories * 10) / 10,
      protein: Math.round(totals.protein * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      source: 'logged' as const,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/actual-vs-goal?days=7
router.get('/actual-vs-goal', async (req, res, next) => {
  try {
    const user = await getUser();
    const days = parseInt(req.query.days as string) || 7;
    const fromDate = daysAgo(days);
    const target = Number(user.calorieTarget) || 2000;

    // Get daily intake (same logic as /daily-intake)
    const imported = await db
      .select()
      .from(dailyIntake)
      .where(and(eq(dailyIntake.userId, user.id), gte(dailyIntake.date, fromDate)))
      .orderBy(dailyIntake.date);

    if (imported.length > 0) {
      res.json(imported.map(i => ({
        date: i.date,
        actual: Number(i.calories),
        goal: target,
        diff: Math.round((Number(i.calories) - target) * 10) / 10,
      })));
      return;
    }

    // Aggregate from food_log
    const logEntries = await db
      .select({ date: foodLog.date, servings: foodLog.servings, calories: foods.calories })
      .from(foodLog)
      .innerJoin(foods, eq(foodLog.foodId, foods.id))
      .where(and(eq(foodLog.userId, user.id), gte(foodLog.date, fromDate)))
      .orderBy(foodLog.date);

    const byDate = new Map<string, number>();
    for (const e of logEntries) {
      const s = Number(e.servings) || 1;
      const cal = (Number(e.calories) || 0) * s;
      byDate.set(e.date, (byDate.get(e.date) ?? 0) + cal);
    }

    const result = Array.from(byDate.entries()).map(([date, actual]) => ({
      date,
      actual: Math.round(actual * 10) / 10,
      goal: target,
      diff: Math.round((actual - target) * 10) / 10,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/bmr — calculate BMR from user profile
router.get('/bmr', async (_req, res, next) => {
  try {
    const user = await getUser();
    const weight = Number(user.currentWeight);
    const height = Number(user.heightInches);
    const age = user.age;
    const sex = user.sex;

    if (!weight || !height || !age || !sex) {
      throw new AppError(400, 'User profile incomplete (need weight, height, age, sex)');
    }

    const bmr = calculateBMR(weight, height, age, sex);
    const activityLevel = Number(user.activityLevel) || 1.25;
    const estimatedTdee = Math.round(bmr * activityLevel);

    res.json({
      bmr: Math.round(bmr),
      activityLevel,
      estimatedTdee,
      calorieTarget: user.calorieTarget ? Number(user.calorieTarget) : estimatedTdee,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
