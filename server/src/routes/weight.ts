import { Router } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { weightLog, users } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

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
    const { date, weight } = req.body;

    if (!date || !weight) {
      throw new AppError(400, 'date and weight are required');
    }

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
        .set({ weight })
        .where(and(eq(weightLog.userId, userId), eq(weightLog.date, date)))
        .returning();
    } else {
      [entry] = await db
        .insert(weightLog)
        .values({ userId, date, weight })
        .returning();
    }

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// PUT /api/weight/:id
router.put('/:id', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const [entry] = await db
      .update(weightLog)
      .set({ weight: req.body.weight })
      .where(and(eq(weightLog.id, req.params.id!), eq(weightLog.userId, userId)))
      .returning();

    if (!entry) throw new AppError(404, 'Weight entry not found');
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

export default router;
