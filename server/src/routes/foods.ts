import { Router } from 'express';
import { eq, and, ilike } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { foods, users } from '../db/schema.js';
import { AppError, validate } from '../middleware/errorHandler.js';
import { foodCreateSchema, foodUpdateSchema } from '../validation/schemas.js';

const router = Router();

async function getUserId(): Promise<string> {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  if (!user) throw new AppError(404, 'No user found');
  return user.id;
}

// GET /api/foods?category=&search=
router.get('/', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const { category, search } = req.query;

    const conditions = [eq(foods.userId, userId)];

    if (category && typeof category === 'string' && category !== 'all') {
      conditions.push(eq(foods.category, category as typeof foods.category.enumValues[number]));
    }

    if (search && typeof search === 'string') {
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      conditions.push(ilike(foods.name, `%${escaped}%`));
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await db
      .select()
      .from(foods)
      .where(and(...conditions))
      .orderBy(foods.name)
      .limit(limit)
      .offset(offset);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/foods
router.post('/', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const { name, emoji, category, servingLabel, servingGrams,
            calories, protein, fat, carbs } = validate(foodCreateSchema, req.body);

    const [food] = await db
      .insert(foods)
      .values({
        name, emoji, category, servingLabel, userId,
        calories: calories != null ? String(calories) : null,
        protein: protein != null ? String(protein) : null,
        fat: fat != null ? String(fat) : null,
        carbs: carbs != null ? String(carbs) : null,
        servingGrams: servingGrams != null ? String(servingGrams) : null,
      })
      .returning();

    res.status(201).json(food);
  } catch (err) {
    next(err);
  }
});

// PUT /api/foods/:id
router.put('/:id', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const validated = validate(foodUpdateSchema, req.body);

    const [food] = await db
      .update(foods)
      .set({ ...validated, updatedAt: new Date() })
      .where(and(eq(foods.id, req.params.id!), eq(foods.userId, userId)))
      .returning();

    if (!food) throw new AppError(404, 'Food not found');
    res.json(food);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/foods/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = await getUserId();
    const [food] = await db
      .delete(foods)
      .where(and(eq(foods.id, req.params.id!), eq(foods.userId, userId)))
      .returning();

    if (!food) throw new AppError(404, 'Food not found');
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
