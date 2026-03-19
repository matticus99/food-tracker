import { Router } from 'express';
import { eq, and, gte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { weightLog, dailyIntake, foodLog, foods, tdeeHistory } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateTdeeHistory, calculateBMR, smoothWeightTrend } from '../services/tdee.js';
import { getComputedCalorieTarget } from '../services/calorieTarget.js';
import { daysQuerySchema } from '../validation/schemas.js';

const router = Router();

import { daysAgo } from '../utils/date.js';

// ── Shared helper: get daily intake data (Fix 4) ──
// Merges imported (dailyIntake) and manually logged (foodLog) data,
// preferring imported data for dates that have both.
async function getDailyIntakeData(userId: string, fromDate: string) {
  // Fetch both sources in parallel
  const [imported, logEntries] = await Promise.all([
    db.select()
      .from(dailyIntake)
      .where(and(eq(dailyIntake.userId, userId), gte(dailyIntake.date, fromDate)))
      .orderBy(dailyIntake.date),
    db.select({
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
      .orderBy(foodLog.date),
  ]);

  // Start with imported data (keyed by date)
  const byDate = new Map<string, { calories: number; protein: number; fat: number; carbs: number; source: string }>();
  const importedDates = new Set<string>();
  for (const i of imported) {
    byDate.set(i.date, {
      calories: Number(i.calories),
      protein: Number(i.protein),
      fat: Number(i.fat),
      carbs: Number(i.carbs),
      source: i.source,
    });
    importedDates.add(i.date);
  }

  // Add food_log data for dates not already covered by imports
  for (const entry of logEntries) {
    if (importedDates.has(entry.date)) continue;
    const s = Number(entry.servings) || 1;
    const existing = byDate.get(entry.date) ?? { calories: 0, protein: 0, fat: 0, carbs: 0, source: 'logged' };
    existing.calories += (Number(entry.calories) || 0) * s;
    existing.protein += (Number(entry.protein) || 0) * s;
    existing.fat += (Number(entry.fat) || 0) * s;
    existing.carbs += (Number(entry.carbs) || 0) * s;
    byDate.set(entry.date, existing);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({
      date,
      calories: Math.round(totals.calories * 10) / 10,
      protein: Math.round(totals.protein * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      source: totals.source,
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
    const [tdeeHistoryData, weightsRaw, intakeData, computedTarget] = await Promise.all([
      db.select()
        .from(tdeeHistory)
        .where(and(eq(tdeeHistory.userId, req.userId), gte(tdeeHistory.date, fromDate)))
        .orderBy(tdeeHistory.date),
      db.select()
        .from(weightLog)
        .where(and(eq(weightLog.userId, req.userId), gte(weightLog.date, fromDate)))
        .orderBy(weightLog.date),
      getDailyIntakeData(req.userId, fromDate),
      getComputedCalorieTarget(user),
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

    // BMR — prefer latest weight log over static profile weight
    const latestLogWeight = weightsRaw.length > 0
      ? Number(weightsRaw[weightsRaw.length - 1]!.weight)
      : null;
    const weight = latestLogWeight ?? Number(user.currentWeight);
    const height = Number(user.heightInches);
    const age = user.age;
    const sex = user.sex;
    let bmr = null;
    if (weight && height && age && sex) {
      const bmrVal = calculateBMR(weight, height, age, sex);
      const activityLevel = Number(user.activityLevel) || 1.25;
      const estimatedTdee = Math.round(bmrVal * activityLevel);

      // Use adaptive TDEE from actual data when available
      const latestAdaptiveTdee = tdee.length > 1
        ? Math.round(tdee[tdee.length - 1]!.tdeeEstimate)
        : null;

      bmr = {
        bmr: Math.round(bmrVal),
        activityLevel,
        estimatedTdee,
        adaptiveTdee: latestAdaptiveTdee,
        calorieTarget: computedTarget?.calorieTarget ?? estimatedTdee,
      };
    }

    // Goals
    const goals = {
      calorieTarget: computedTarget?.calorieTarget ?? 2000,
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
    const ct = await getComputedCalorieTarget(req.user);
    const target = ct?.calorieTarget ?? 2000;
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
      calorieTarget: (await getComputedCalorieTarget(user))?.calorieTarget ?? estimatedTdee,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/tdee-breakdown — detailed TDEE calculation breakdown
router.get('/tdee-breakdown', async (req, res, next) => {
  try {
    const user = req.user;
    const weight = Number(user.currentWeight);
    const height = Number(user.heightInches);
    const age = user.age;
    const sex = user.sex;
    const activityLevel = Number(user.activityLevel) || 1.25;
    const smoothing = Number(user.tdeeSmoothingFactor) || 0.1;

    // BMR calculation details
    let bmrDetails = null;
    if (weight && height && age && sex) {
      const weightKg = Math.round(weight * 0.453592 * 10) / 10;
      const heightCm = Math.round(height * 2.54 * 10) / 10;
      const bmr = calculateBMR(weight, height, age, sex);
      const estimatedTdee = Math.round(bmr * activityLevel);
      bmrDetails = {
        weightLbs: weight,
        weightKg,
        heightInches: height,
        heightCm,
        age,
        sex,
        bmr: Math.round(bmr),
        activityLevel,
        activityLabel: getActivityLabel(activityLevel),
        estimatedTdee,
      };
    }

    // Adaptive TDEE details
    const fromDate = daysAgo(90);
    const [tdeeRows, weightsRaw, intakeData] = await Promise.all([
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

    let adaptiveDetails = null;
    let tdeeTimeline: { date: string; tdeeEstimate: number }[] = [];

    if (tdeeRows.length > 0) {
      const latest = tdeeRows[tdeeRows.length - 1]!;
      tdeeTimeline = tdeeRows.map(h => ({
        date: h.date,
        tdeeEstimate: Number(h.tdeeEstimate),
      }));
      adaptiveDetails = {
        latestValue: Math.round(Number(latest.tdeeEstimate)),
        latestDate: latest.date,
        dataPoints: tdeeRows.length,
        dateRange: { from: tdeeRows[0]!.date, to: latest.date },
        smoothingFactor: smoothing,
      };
    } else {
      // Compute on-the-fly from weight + intake
      const weightMap = new Map(weightsRaw.map(w => [w.date, Number(w.weight)]));
      const dataPoints = intakeData
        .filter(i => weightMap.has(i.date))
        .map(i => ({
          date: i.date,
          weight: weightMap.get(i.date)!,
          calories: i.calories,
        }));

      if (dataPoints.length > 1) {
        const computed = calculateTdeeHistory(dataPoints, smoothing);
        tdeeTimeline = computed.map(c => ({
          date: c.date,
          tdeeEstimate: c.tdeeEstimate,
        }));
        const latest = computed[computed.length - 1]!;
        adaptiveDetails = {
          latestValue: Math.round(latest.tdeeEstimate),
          latestDate: latest.date,
          dataPoints: computed.length,
          dateRange: { from: computed[0]!.date, to: latest.date },
          smoothingFactor: smoothing,
        };
      }
    }

    // Calorie target computation
    const computedTarget = await getComputedCalorieTarget(user);

    // Weight data summary
    const weightSummary = weightsRaw.length > 0
      ? {
          entries: weightsRaw.length,
          latest: Number(weightsRaw[weightsRaw.length - 1]!.weight),
          earliest: Number(weightsRaw[0]!.weight),
          dateRange: { from: weightsRaw[0]!.date, to: weightsRaw[weightsRaw.length - 1]!.date },
        }
      : null;

    // Intake data summary
    const intakeSummary = intakeData.length > 0
      ? {
          entries: intakeData.length,
          avgCalories: Math.round(intakeData.reduce((s, i) => s + i.calories, 0) / intakeData.length),
        }
      : null;

    res.json({
      bmr: bmrDetails,
      adaptive: adaptiveDetails,
      tdeeTimeline,
      target: computedTarget,
      weightSummary,
      intakeSummary,
      objective: user.objective ?? 'maintain',
      goalPace: user.goalPace ?? 500,
    });
  } catch (err) {
    next(err);
  }
});

function getActivityLabel(level: number): string {
  if (level <= 1) return 'Sedentary';
  if (level <= 1.15) return 'Lightly Active';
  if (level <= 1.25) return 'Moderately Active';
  if (level <= 1.4) return 'Active';
  return 'Very Active';
}

export default router;
