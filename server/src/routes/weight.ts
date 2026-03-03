import { Router } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { weightLog, dailyIntake, foodLog, foods, tdeeHistory, users } from '../db/schema.js';
import { AppError, validate } from '../middleware/errorHandler.js';
import { calculateTdeeHistory } from '../services/tdee.js';
import { weightCreateSchema } from '../validation/schemas.js';

const router = Router();

async function getUserId(): Promise<string> {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  if (!user) throw new AppError(404, 'No user found');
  return user.id;
}

// GET /api/weight?from=&to=
router.get('/', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const { from, to } = req.query;

    const conditions = [eq(weightLog.userId, userId)];
    if (from && typeof from === 'string') conditions.push(gte(weightLog.date, from));
    if (to && typeof to === 'string') conditions.push(lte(weightLog.date, to));

    const entries = await db
      .select()
      .from(weightLog)
      .where(and(...conditions))
      .orderBy(weightLog.date);

    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// POST /api/weight
router.post('/', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const { date, weight } = validate(weightCreateSchema, req.body);

    // Upsert — update if date exists, otherwise insert
    const existing = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, userId), eq(weightLog.date, date)))
      .limit(1);

    let entry;
    if (existing.length > 0) {
      [entry] = await db
        .update(weightLog)
        .set({ weight: String(weight) })
        .where(and(eq(weightLog.userId, userId), eq(weightLog.date, date)))
        .returning();
    } else {
      [entry] = await db
        .insert(weightLog)
        .values({ userId, date, weight: String(weight) })
        .returning();
    }

    // Trigger TDEE recalculation in background
    recalculateTdee(userId).catch((err) => {
      console.error('[TDEE Recalc Error]', err.message);
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

async function recalculateTdee(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const smoothing = Number(user.tdeeSmoothingFactor) || 0.1;

  // Get all weights
  const weights = await db
    .select()
    .from(weightLog)
    .where(eq(weightLog.userId, userId))
    .orderBy(weightLog.date);

  // Get all intake (from daily_intake or aggregated food_log)
  let intakeMap = new Map<string, number>();

  const imported = await db
    .select()
    .from(dailyIntake)
    .where(eq(dailyIntake.userId, userId))
    .orderBy(dailyIntake.date);

  if (imported.length > 0) {
    for (const i of imported) {
      intakeMap.set(i.date, Number(i.calories));
    }
  } else {
    const logEntries = await db
      .select({ date: foodLog.date, servings: foodLog.servings, calories: foods.calories })
      .from(foodLog)
      .innerJoin(foods, eq(foodLog.foodId, foods.id))
      .where(eq(foodLog.userId, userId))
      .orderBy(foodLog.date);

    for (const e of logEntries) {
      const s = Number(e.servings) || 1;
      const cal = (Number(e.calories) || 0) * s;
      intakeMap.set(e.date, (intakeMap.get(e.date) ?? 0) + cal);
    }
  }

  // Build data points where both weight and intake exist
  const dataPoints = weights
    .filter(w => intakeMap.has(w.date))
    .map(w => ({
      date: w.date,
      weight: Number(w.weight),
      calories: intakeMap.get(w.date)!,
    }));

  if (dataPoints.length < 2) return;

  const results = calculateTdeeHistory(dataPoints, smoothing);

  // Upsert TDEE history
  for (const r of results) {
    const existing = await db
      .select()
      .from(tdeeHistory)
      .where(and(eq(tdeeHistory.userId, userId), eq(tdeeHistory.date, r.date)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(tdeeHistory)
        .set({
          tdeeEstimate: String(r.tdeeEstimate),
          caloriesConsumed: String(r.caloriesConsumed),
          weightUsed: String(r.weightUsed),
        })
        .where(and(eq(tdeeHistory.userId, userId), eq(tdeeHistory.date, r.date)));
    } else {
      await db.insert(tdeeHistory).values({
        userId,
        date: r.date,
        tdeeEstimate: String(r.tdeeEstimate),
        caloriesConsumed: String(r.caloriesConsumed),
        weightUsed: String(r.weightUsed),
      });
    }
  }

  // Also update user's current weight
  const latestWeight = weights[weights.length - 1];
  if (latestWeight) {
    await db
      .update(users)
      .set({ currentWeight: latestWeight.weight, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

// PUT /api/weight/:id
router.put('/:id', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const { weight: weightVal } = validate(weightCreateSchema.pick({ weight: true }), req.body);
    const [entry] = await db
      .update(weightLog)
      .set({ weight: String(weightVal) })
      .where(and(eq(weightLog.id, req.params.id!), eq(weightLog.userId, userId)))
      .returning();

    if (!entry) throw new AppError(404, 'Weight entry not found');

    // Trigger TDEE recalculation in background
    recalculateTdee(userId).catch((err) => {
      console.error('[TDEE Recalc Error]', err.message);
    });

    res.json(entry);
  } catch (err) {
    next(err);
  }
});

export default router;
