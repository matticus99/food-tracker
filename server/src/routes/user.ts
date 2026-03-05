import { Router, type RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { validate } from '../middleware/errorHandler.js';
import { invalidateUserCache } from '../middleware/userMiddleware.js';
import { userUpdateSchema } from '../validation/schemas.js';
import { getComputedCalorieTarget } from '../services/calorieTarget.js';

const router = Router();

// GET /api/user — get the single user + computed calorie target
router.get('/', async (req, res, next) => {
  try {
    const computedCalorieTarget = await getComputedCalorieTarget(req.user);
    res.json({ ...req.user, computedCalorieTarget });
  } catch (err) {
    next(err);
  }
});

// PUT/POST /api/user — update user settings (POST needed for sendBeacon on iOS)
const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const { age, sex, heightInches, currentWeight, objective, activityLevel,
            goalPace, proteinTarget, fatTarget, carbTarget,
            tdeeSmoothingFactor } = validate(userUpdateSchema, req.body);

    const [updated] = await db
      .update(users)
      .set({
        age, sex, objective, goalPace,
        proteinTarget, fatTarget, carbTarget,
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
};
router.put('/', updateUser);
router.post('/', updateUser);

export default router;
