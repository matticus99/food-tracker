import { eq, and, gte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { dailyIntake, foodLog, foods } from '../db/schema.js';

/**
 * Merges imported (dailyIntake) and manually logged (foodLog) data,
 * preferring imported data for dates that have both.
 */
export async function getDailyIntakeData(userId: string, fromDate: string) {
  const [imported, logEntries] = await Promise.all([
    db.select()
      .from(dailyIntake)
      .where(and(eq(dailyIntake.userId, userId), gte(dailyIntake.date, fromDate)))
      .orderBy(dailyIntake.date),
    db.select({
      date: foodLog.date,
      servings: foodLog.servings,
      calories: foods.calories,
      protein: foods.protein,
      fat: foods.fat,
      carbs: foods.carbs,
    })
      .from(foodLog)
      .innerJoin(foods, eq(foodLog.foodId, foods.id))
      .where(and(eq(foodLog.userId, userId), gte(foodLog.date, fromDate)))
      .orderBy(foodLog.date),
  ]);

  const byDate = new Map<string, { calories: number; protein: number; fat: number; carbs: number; source: string }>();
  const importedDates = new Set<string>();
  for (const i of imported) {
    byDate.set(i.date, {
      calories: Number(i.calories),
      protein: Number(i.protein),
      fat: Number(i.fat),
      carbs: Number(i.carbs),
      source: i.source,
    });
    importedDates.add(i.date);
  }

  for (const entry of logEntries) {
    if (importedDates.has(entry.date)) continue;
    const s = Number(entry.servings) || 1;
    const existing = byDate.get(entry.date) ?? { calories: 0, protein: 0, fat: 0, carbs: 0, source: 'logged' };
    existing.calories += (Number(entry.calories) || 0) * s;
    existing.protein += (Number(entry.protein) || 0) * s;
    existing.fat += (Number(entry.fat) || 0) * s;
    existing.carbs += (Number(entry.carbs) || 0) * s;
    byDate.set(entry.date, existing);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({
      date,
      calories: Math.round(totals.calories * 10) / 10,
      protein: Math.round(totals.protein * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      source: totals.source,
    }));
}
