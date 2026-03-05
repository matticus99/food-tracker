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
    const validated = validate(userUpdateSchema, req.body);

    const setObj: Record<string, unknown> = { updatedAt: new Date() };
    if (validated.age !== undefined) setObj.age = validated.age;
    if (validated.sex !== undefined) setObj.sex = validated.sex;
    if (validated.objective !== undefined) setObj.objective = validated.objective;
    if (validated.goalPace !== undefined) setObj.goalPace = validated.goalPace;
    if (validated.proteinTarget !== undefined) setObj.proteinTarget = validated.proteinTarget;
    if (validated.fatTarget !== undefined) setObj.fatTarget = validated.fatTarget;
    if (validated.carbTarget !== undefined) setObj.carbTarget = validated.carbTarget;
    if (validated.heightInches !== undefined)
      setObj.heightInches = validated.heightInches != null ? String(validated.heightInches) : null;
    if (validated.currentWeight !== undefined)
      setObj.currentWeight = validated.currentWeight != null ? String(validated.currentWeight) : null;
    if (validated.activityLevel !== undefined)
      setObj.activityLevel = validated.activityLevel != null ? String(validated.activityLevel) : null;
    if (validated.tdeeSmoothingFactor !== undefined)
      setObj.tdeeSmoothingFactor = validated.tdeeSmoothingFactor != null ? String(validated.tdeeSmoothingFactor) : null;

    const [updated] = await db
      .update(users)
      .set(setObj)
      .where(eq(users.id, req.userId))
      .returning();

    invalidateUserCache();

    const computedCalorieTarget = updated
      ? await getComputedCalorieTarget(updated as any)
      : null;
    if (updated) {
      console.log('[Settings Save]', req.method, {
        profile: { age: updated.age, sex: updated.sex, height: updated.heightInches, weight: updated.currentWeight },
        calorieTarget: computedCalorieTarget?.calorieTarget ?? null,
        tdeeSource: computedCalorieTarget?.tdeeSource ?? null,
      });
    }
    res.json({ ...updated, computedCalorieTarget });
  } catch (err) {
    next(err);
  }
};
router.put('/', updateUser);
router.post('/', updateUser);

export default router;
