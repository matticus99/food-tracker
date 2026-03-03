import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { validate } from '../middleware/errorHandler.js';
import { invalidateUserCache } from '../middleware/userMiddleware.js';
import { userUpdateSchema } from '../validation/schemas.js';

const router = Router();

// GET /api/user — get the single user (already fetched by middleware)
router.get('/', (_req, res) => {
  res.json(_req.user);
});

// PUT /api/user — update user settings
router.put('/', async (req, res, next) => {
  try {
    const { age, sex, heightInches, currentWeight, objective, activityLevel,
            calorieTarget, proteinTarget, fatTarget, carbTarget,
            tdeeSmoothingFactor } = validate(userUpdateSchema, req.body);

    const [updated] = await db
      .update(users)
      .set({
        age, sex, objective,
        calorieTarget, proteinTarget, fatTarget, carbTarget,
        heightInches: heightInches != null ? String(heightInches) : heightInches,
        currentWeight: currentWeight != null ? String(currentWeight) : currentWeight,
        activityLevel: activityLevel != null ? String(activityLevel) : activityLevel,
        tdeeSmoothingFactor: tdeeSmoothingFactor != null ? String(tdeeSmoothingFactor) : tdeeSmoothingFactor,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId))
      .returning();

    invalidateUserCache();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
