import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { AppError, validate } from '../middleware/errorHandler.js';
import { userUpdateSchema } from '../validation/schemas.js';

const router = Router();

// GET /api/user — get the single user (first row)
router.get('/', async (_req, res, next) => {
  try {
    const [user] = await db.select().from(users).limit(1);
    if (!user) throw new AppError(404, 'No user found. Run seed first.');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/user — update user settings
router.put('/', async (req, res, next) => {
  try {
    const [user] = await db.select().from(users).limit(1);
    if (!user) throw new AppError(404, 'No user found');

    const { age, sex, heightInches, currentWeight, objective, activityLevel,
            calorieTarget, proteinTarget, fatTarget, carbTarget,
            tdeeSmoothingFactor } = validate(userUpdateSchema, req.body);

    const [updated] = await db
      .update(users)
      .set({
        age, sex, heightInches, currentWeight, objective, activityLevel,
        calorieTarget, proteinTarget, fatTarget, carbTarget,
        tdeeSmoothingFactor, updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
