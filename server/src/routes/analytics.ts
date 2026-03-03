import { Router } from 'express';
import { eq, and, gte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { weightLog, dailyIntake, foodLog, foods, tdeeHistory } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateTdeeHistory, calculateBMR, smoothWeightTrend } from '../services/tdee.js';
import { daysQuerySchema } from '../validation/schemas.js';

const router = Router();

function daysAgo(days: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0]!;
}

// ── Shared helper: get daily intake data (Fix 4) ──
async function getDailyIntakeData(userId: string, fromDate: string) {
  // Try daily_intake table first (imported data)
  const imported = await db
    .select()
    .from(dailyIntake)
    .where(and(eq(dailyIntake.userId, userId), gte(dailyIntake.date, fromDate)))
    .orderBy(dailyIntake.date);

  if (imported.length > 0) {
    return imported.map(i => ({
      date: i.date,
      calories: Number(i.calories),
      protein: Number(i.protein),
      fat: Number(i.fat),
      carbs: Number(i.carbs),
      source: i.source,
    }));
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
    .where(and(eq(foodLog.userId, userId), gte(foodLog.date, fromDate)))
    .orderBy(foodLog.date);

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

  return Array.from(byDate.entries()).map(([date, totals]) => ({
    date,
    calories: Math.round(totals.calories * 10) / 10,
    protein: Math.round(totals.protein * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    source: 'logged' as const,
  }));
}

// ── GET /api/analytics/summary?days=30 (Fix 3: consolidated endpoint) ──
router.get('/summary', async (req, res, next) => {
  try {
    const days = daysQuerySchema.parse(req.query.days ?? 30);
    const fromDate = daysAgo(days);
    const user = req.user;
    const smoothing = Number(user.tdeeSmoothingFactor) || 0.1;

    // Run all queries in parallel
    const [tdeeHistoryData, weightsRaw, intakeData] = await Promise.all([
      db.select()
        .from(tdeeHistory)
        .where(and(eq(tdeeHistory.userId, req.userId), gte(tdeeHistory.date, fromDate)))
        .orderBy(tdeeHistory.date),
      db.select()
        .from(weightLog)
        .where(and(eq(weightLog.userId, req.userId), gte(weightLog.date, fromDate)))
        .orderBy(weightLog.date),
      getDailyIntakeData(req.userId, fromDate),
    ]);

    // TDEE data
    let tdee;
    if (tdeeHistoryData.length > 0) {
      tdee = tdeeHistoryData.map(h => ({
        date: h.date,
        tdeeEstimate: Number(h.tdeeEstimate),
        caloriesConsumed: Number(h.caloriesConsumed),
        weightUsed: h.weightUsed ? Number(h.weightUsed) : null,
      }));
    } else {
      const weightMap = new Map(weightsRaw.map(w => [w.date, Number(w.weight)]));
      const dataPoints = intakeData
        .filter(i => weightMap.has(i.date))
        .map(i => ({
          date: i.date,
          weight: weightMap.get(i.date)!,
          calories: i.calories,
        }));
      tdee = calculateTdeeHistory(dataPoints, smoothing);
    }

    // Weight trend
    const weightTrend = smoothWeightTrend(
      weightsRaw.map(w => ({ date: w.date, weight: Number(w.weight) })),
      smoothing,
    );

    // BMR
    const weight = Number(user.currentWeight);
    const height = Number(user.heightInches);
    const age = user.age;
    const sex = user.sex;
    let bmr = null;
    if (weight && height && age && sex) {
      const bmrVal = calculateBMR(weight, height, age, sex);
      const activityLevel = Number(user.activityLevel) || 1.25;
      const estimatedTdee = Math.round(bmrVal * activityLevel);
      bmr = {
        bmr: Math.round(bmrVal),
        activityLevel,
        estimatedTdee,
        calorieTarget: user.calorieTarget ? Number(user.calorieTarget) : estimatedTdee,
      };
    }

    // Goals
    const goals = {
      calorieTarget: user.calorieTarget ? Number(user.calorieTarget) : 2000,
      proteinTarget: user.proteinTarget ? Number(user.proteinTarget) : 150,
      fatTarget: user.fatTarget ? Number(user.fatTarget) : 70,
      carbTarget: user.carbTarget ? Number(user.carbTarget) : 240,
    };

    res.json({
      tdee,
      weightTrend,
      dailyIntake: intakeData,
      bmr,
      goals,
    });
  } catch (err) {
    next(err);
  }
});

// ── Individual endpoints (kept for backward compat) ──

// GET /api/analytics/tdee?days=14
router.get('/tdee', async (req, res, next) => {
  try {
    const days = daysQuerySchema.parse(req.query.days ?? 14);
    const fromDate = daysAgo(days);
    const smoothing = Number(req.user.tdeeSmoothingFactor) || 0.1;

    const history = await db
      .select()
      .from(tdeeHistory)
      .where(and(eq(tdeeHistory.userId, req.userId), gte(tdeeHistory.date, fromDate)))
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

    const weights = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, req.userId), gte(weightLog.date, fromDate)))
      .orderBy(weightLog.date);

    const intakes = await db
      .select()
      .from(dailyIntake)
      .where(and(eq(dailyIntake.userId, req.userId), gte(dailyIntake.date, fromDate)))
      .orderBy(dailyIntake.date);

    const weightMap = new Map(weights.map(w => [w.date, Number(w.weight)]));
    const dataPoints = intakes
      .filter(i => weightMap.has(i.date))
      .map(i => ({
        date: i.date,
        weight: weightMap.get(i.date)!,
        calories: Number(i.calories),
      }));

    const results = calculateTdeeHistory(dataPoints, smoothing);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/weight-trend?days=14
router.get('/weight-trend', async (req, res, next) => {
  try {
    const days = daysQuerySchema.parse(req.query.days ?? 14);
    const fromDate = daysAgo(days);
    const smoothing = Number(req.user.tdeeSmoothingFactor) || 0.1;

    const weights = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, req.userId), gte(weightLog.date, fromDate)))
      .orderBy(weightLog.date);

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
    const days = daysQuerySchema.parse(req.query.days ?? 7);
    const fromDate = daysAgo(days);
    const result = await getDailyIntakeData(req.userId, fromDate);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/actual-vs-goal?days=7
router.get('/actual-vs-goal', async (req, res, next) => {
  try {
    const days = daysQuerySchema.parse(req.query.days ?? 7);
    const fromDate = daysAgo(days);
    const target = Number(req.user.calorieTarget) || 2000;
    const intakeData = await getDailyIntakeData(req.userId, fromDate);

    res.json(intakeData.map(i => ({
      date: i.date,
      actual: i.calories,
      goal: target,
      diff: Math.round((i.calories - target) * 10) / 10,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/bmr
router.get('/bmr', async (req, res, next) => {
  try {
    const user = req.user;
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
