import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { foodLog, foods, users } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

async function getUserId(): Promise<string> {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  if (!user) throw new AppError(404, 'No user found');
  return user.id;
}

// GET /api/log?date=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      throw new AppError(400, 'date query parameter is required (YYYY-MM-DD)');
    }

    const entries = await db
      .select({
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
      .orderBy(foodLog.timeHour, foodLog.createdAt);

    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// POST /api/log
router.post('/', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const { foodId, date, timeHour, servings } = req.body;

    if (!foodId || !date || timeHour === undefined) {
      throw new AppError(400, 'foodId, date, and timeHour are required');
    }

    const [entry] = await db
      .insert(foodLog)
      .values({ userId, foodId, date, timeHour, servings: servings ?? '1' })
      .returning();

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// PUT /api/log/:id
router.put('/:id', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const { servings, timeHour, date } = req.body;

    const [entry] = await db
      .update(foodLog)
      .set({ servings, timeHour, date, updatedAt: new Date() })
      .where(and(eq(foodLog.id, req.params.id!), eq(foodLog.userId, userId)))
      .returning();

    if (!entry) throw new AppError(404, 'Log entry not found');
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/log/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const [entry] = await db
      .delete(foodLog)
      .where(and(eq(foodLog.id, req.params.id!), eq(foodLog.userId, userId)))
      .returning();

    if (!entry) throw new AppError(404, 'Log entry not found');
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
