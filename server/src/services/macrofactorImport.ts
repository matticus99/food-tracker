import XLSX from 'xlsx';
import { db } from '../db/connection.js';
import { foods, dailyIntake, weightLog, tdeeHistory, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

interface ImportSummary {
  intakeDays: number;
  weightDays: number;
  tdeeDays: number;
  favoriteFoods: number;
  historyFoods: number;
  skipped: { intake: number; weight: number; tdee: number; foods: number };
}

/**
 * Convert Excel serial date number to ISO date string (YYYY-MM-DD).
 */
function excelDateToISO(serial: number): string {
  // Excel epoch is Jan 0 1900 (with the Lotus 1-2-3 leap year bug)
  // Use UTC to avoid timezone-dependent date shifts
  const excelEpochMs = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpochMs + serial * 86400000);
  return date.toISOString().split('T')[0]!;
}

/**
 * Parse a MacroFactor .xlsx export and import data into the database.
 */
export async function importMacroFactor(
  buffer: Buffer,
  userId: string,
): Promise<ImportSummary> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const summary: ImportSummary = {
    intakeDays: 0,
    weightDays: 0,
    tdeeDays: 0,
    favoriteFoods: 0,
    historyFoods: 0,
    skipped: { intake: 0, weight: 0, tdee: 0, foods: 0 },
  };

  // ── Import Calories & Macros → daily_intake ──
  const macroSheet = workbook.Sheets['Calories & Macros'];
  if (macroSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(macroSheet);
    for (const row of rows) {
      const dateRaw = row['Date'];
      if (!dateRaw) continue;

      const date = typeof dateRaw === 'number' ? excelDateToISO(dateRaw) : String(dateRaw);
      const calories = Number(row['Calories (kcal)'] ?? row['Calories']) || 0;
      const protein = Number(row['Protein (g)'] ?? row['Protein']) || 0;
      const fat = Number(row['Fat (g)'] ?? row['Fat']) || 0;
      const carbs = Number(row['Carbs (g)'] ?? row['Carbs']) || 0;

      // Check for duplicate
      const existing = await db
        .select({ id: dailyIntake.id })
        .from(dailyIntake)
        .where(and(eq(dailyIntake.userId, userId), eq(dailyIntake.date, date)))
        .limit(1);

      if (existing.length > 0) {
        summary.skipped.intake++;
        continue;
      }

      await db.insert(dailyIntake).values({
        userId,
        date,
        calories: String(calories),
        protein: String(protein),
        fat: String(fat),
        carbs: String(carbs),
        source: 'imported',
      });
      summary.intakeDays++;
    }
  }

  // ── Import Scale Weight → weight_log ──
  const weightSheet = workbook.Sheets['Scale Weight'];
  if (weightSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(weightSheet);
    for (const row of rows) {
      const dateRaw = row['Date'];
      if (!dateRaw) continue;

      const date = typeof dateRaw === 'number' ? excelDateToISO(dateRaw) : String(dateRaw);
      const weight = Number(row['Weight (lbs)'] ?? row['Weight']) || 0;
      if (!weight) continue;

      const existing = await db
        .select({ id: weightLog.id })
        .from(weightLog)
        .where(and(eq(weightLog.userId, userId), eq(weightLog.date, date)))
        .limit(1);

      if (existing.length > 0) {
        summary.skipped.weight++;
        continue;
      }

      await db.insert(weightLog).values({ userId, date, weight: String(weight) });
      summary.weightDays++;
    }
  }

  // ── Import Expenditure → tdee_history ──
  const expenditureSheet = workbook.Sheets['Expenditure'];
  const weightTrendSheet = workbook.Sheets['Weight Trend'];

  // Build weight trend lookup
  const trendMap = new Map<string, number>();
  if (weightTrendSheet) {
    const trendRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(weightTrendSheet);
    for (const row of trendRows) {
      const dateRaw = row['Date'];
      if (!dateRaw) continue;
      const date = typeof dateRaw === 'number' ? excelDateToISO(dateRaw) : String(dateRaw);
      const trend = Number(row['Weight Trend (lbs)'] ?? row['Weight Trend']) || 0;
      if (trend) trendMap.set(date, trend);
    }
  }

  if (expenditureSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(expenditureSheet);
    for (const row of rows) {
      const dateRaw = row['Date'];
      if (!dateRaw) continue;

      const date = typeof dateRaw === 'number' ? excelDateToISO(dateRaw) : String(dateRaw);
      const tdee = Number(row['Expenditure (kcal)'] ?? row['Expenditure']) || 0;
      if (!tdee) continue;

      const existing = await db
        .select({ id: tdeeHistory.id })
        .from(tdeeHistory)
        .where(and(eq(tdeeHistory.userId, userId), eq(tdeeHistory.date, date)))
        .limit(1);

      if (existing.length > 0) {
        summary.skipped.tdee++;
        continue;
      }

      const weightUsed = trendMap.get(date);
      await db.insert(tdeeHistory).values({
        userId,
        date,
        tdeeEstimate: String(tdee),
        caloriesConsumed: '0', // Will be linked with daily_intake data
        weightUsed: weightUsed ? String(weightUsed) : null,
      });
      summary.tdeeDays++;
    }
  }

  // ── Import Favorites → foods (with full macros) ──
  const favoritesSheet = workbook.Sheets['Favorites'];
  if (favoritesSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(favoritesSheet);
    for (const row of rows) {
      const name = String(row['Name'] ?? row['Food Name'] ?? '').trim();
      if (!name) continue;

      // Check if food with same name already exists
      const existing = await db
        .select({ id: foods.id })
        .from(foods)
        .where(and(eq(foods.userId, userId), eq(foods.name, name)))
        .limit(1);

      if (existing.length > 0) {
        summary.skipped.foods++;
        continue;
      }

      const calories = Number(row['Calories (kcal)'] ?? row['Calories']) || null;
      const protein = Number(row['Protein (g)'] ?? row['Protein']) || null;
      const fat = Number(row['Fat (g)'] ?? row['Fat']) || null;
      const carbs = Number(row['Carbs (g)'] ?? row['Carbs']) || null;
      const servingLabel = String(row['Serving Size'] ?? row['Serving'] ?? 'per serving');

      await db.insert(foods).values({
        userId,
        name,
        category: 'other',
        servingLabel,
        calories: calories !== null ? String(calories) : null,
        protein: protein !== null ? String(protein) : null,
        fat: fat !== null ? String(fat) : null,
        carbs: carbs !== null ? String(carbs) : null,
        source: 'imported_favorite',
      });
      summary.favoriteFoods++;
    }
  }

  // ── Import History → foods (names only, no macros) ──
  const historySheet = workbook.Sheets['History'];
  if (historySheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(historySheet);
    for (const row of rows) {
      const name = String(row['Name'] ?? row['Food Name'] ?? '').trim();
      if (!name) continue;

      const existing = await db
        .select({ id: foods.id })
        .from(foods)
        .where(and(eq(foods.userId, userId), eq(foods.name, name)))
        .limit(1);

      if (existing.length > 0) {
        summary.skipped.foods++;
        continue;
      }

      await db.insert(foods).values({
        userId,
        name,
        category: 'other',
        source: 'imported_history',
      });
      summary.historyFoods++;
    }
  }

  return summary;
}
