import { Router } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { foodLog, foods, weightLog, tdeeHistory } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateDateParam } from '../validation/schemas.js';
import { calculateTdeeHistory } from '../services/tdee.js';
import { getComputedCalorieTarget } from '../services/calorieTarget.js';
import { getDailyIntakeData } from '../services/dailyIntakeData.js';

const router = Router();

import { daysAgo } from '../utils/date.js';

// GET /api/dashboard?date=YYYY-MM-DD
// Returns all data needed for DashboardView in a single response
router.get('/', async (req, res, next) => {
  try {
    const date = validateDateParam(req.query.date, 'date');

    const user = req.user;
    const userId = req.userId;
    const fromDate30 = daysAgo(30);
    const smoothing = Number(user.tdeeSmoothingFactor) || 0.1;

    // Run all queries in parallel
    const [logEntries, todayWeight, tdeeHistoryData, intakeData, computedCalorieTarget] = await Promise.all([
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

      // TDEE history (last 30 days for chart)
      db.select()
        .from(tdeeHistory)
        .where(and(eq(tdeeHistory.userId, userId), gte(tdeeHistory.date, fromDate30)))
        .orderBy(tdeeHistory.date),

      // Daily intake (last 30 days, merges imports + food_log)
      getDailyIntakeData(userId, fromDate30),

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
        .where(and(eq(weightLog.userId, userId), gte(weightLog.date, fromDate30)))
        .orderBy(weightLog.date);

      const weightMap = new Map(weights.map(w => [w.date, Number(w.weight)]));
      const dataPoints = intakeData
        .filter(i => weightMap.has(i.date))
        .map(i => ({
          date: i.date,
          weight: weightMap.get(i.date)!,
          calories: i.calories,
        }));
      tdeeData = calculateTdeeHistory(dataPoints, smoothing);
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
