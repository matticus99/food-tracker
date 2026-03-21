import { desc, eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { tdeeHistory } from '../db/schema.js';
import { calculateBMR, computeCalorieTarget } from './tdee.js';
import type { CalorieTargetResult } from './tdee.js';

interface UserForCalorieTarget {
  id: string;
  age: number | null;
  sex: 'male' | 'female' | null;
  heightInches: string | null;
  currentWeight: string | null;
  activityLevel: string | null;
  objective: 'cut' | 'maintain' | 'bulk' | null;
  goalPace: number | null;
}

export async function getComputedCalorieTarget(
  user: UserForCalorieTarget,
): Promise<CalorieTargetResult | null> {
  // 1. Get latest adaptive TDEE
  const [latestTdee] = await db
    .select({ tdeeEstimate: tdeeHistory.tdeeEstimate })
    .from(tdeeHistory)
    .where(eq(tdeeHistory.userId, user.id))
    .orderBy(desc(tdeeHistory.date))
    .limit(1);

  const adaptiveTdee = latestTdee ? Number(latestTdee.tdeeEstimate) : null;

  // 2. Compute estimated TDEE (BMR × activityLevel) as fallback
  let estimatedTdee: number | null = null;
  const weight = Number(user.currentWeight);
  const height = Number(user.heightInches);
  const age = user.age;
  const sex = user.sex;
  if (weight && height && age && sex) {
    const bmr = calculateBMR(weight, height, age, sex);
    const activityLevel = Number(user.activityLevel) || 1.25;
    estimatedTdee = Math.round(bmr * activityLevel);
  }

  // 3. Compute target
  return computeCalorieTarget({
    latestAdaptiveTdee: adaptiveTdee,
    estimatedTdee,
    objective: user.objective ?? 'maintain',
    goalPace: user.goalPace ?? 500,
  });
}
