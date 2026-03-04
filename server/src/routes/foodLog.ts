import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { foodLog, foods } from '../db/schema.js';
import { AppError, validate } from '../middleware/errorHandler.js';
import { foodLogCreateSchema, foodLogUpdateSchema } from '../validation/schemas.js';

const router = Router();

// GET /api/log?date=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
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
          servingGrams: foods.servingGrams,
          calories: foods.calories,
          protein: foods.protein,
          fat: foods.fat,
          carbs: foods.carbs,
        },
      })
      .from(foodLog)
      .innerJoin(foods, eq(foodLog.foodId, foods.id))
      .where(and(eq(foodLog.userId, req.userId), eq(foodLog.date, date)))
      .orderBy(foodLog.timeHour, foodLog.createdAt);

    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// POST /api/log
router.post('/', async (req, res, next) => {
  try {
    const { foodId, date, timeHour, servings } = validate(foodLogCreateSchema, req.body);

    const [entry] = await db
      .insert(foodLog)
      .values({ userId: req.userId, foodId, date, timeHour, servings: String(servings) })
      .returning();

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// POST /api/log/batch
router.post('/batch', async (req, res, next) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 50) {
      throw new AppError(400, 'entries must be an array of 1-50 items');
    }

    const values = entries.map((e: unknown) => {
      const { foodId, date, timeHour, servings } = validate(foodLogCreateSchema, e);
      return { userId: req.userId, foodId, date, timeHour, servings: String(servings) };
    });

    const inserted = await db.insert(foodLog).values(values).returning();
    res.status(201).json(inserted);
  } catch (err) {
    next(err);
  }
});

// PUT /api/log/:id
router.put('/:id', async (req, res, next) => {
  try {
    const validated = validate(foodLogUpdateSchema, req.body);

    const { servings, ...rest } = validated;
    const [entry] = await db
      .update(foodLog)
      .set({
        ...rest,
        ...(servings !== undefined && { servings: String(servings) }),
        updatedAt: new Date(),
      })
      .where(and(eq(foodLog.id, req.params.id!), eq(foodLog.userId, req.userId)))
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
    const [entry] = await db
      .delete(foodLog)
      .where(and(eq(foodLog.id, req.params.id!), eq(foodLog.userId, req.userId)))
      .returning();

    if (!entry) throw new AppError(404, 'Log entry not found');
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
