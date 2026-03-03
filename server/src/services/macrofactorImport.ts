import ExcelJS from 'exceljs';
import { db } from '../db/connection.js';
import { foods, dailyIntake, weightLog, tdeeHistory } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';

const MAX_ROWS_PER_SHEET = 5000;

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
export function excelDateToISO(serial: number): string {
  // Excel epoch is Jan 0 1900 (with the Lotus 1-2-3 leap year bug)
  // Use UTC to avoid timezone-dependent date shifts
  const excelEpochMs = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpochMs + serial * 86400000);
  return date.toISOString().split('T')[0]!;
}

/** Read a worksheet into an array of key-value objects using the header row. */
function sheetToRows(worksheet: ExcelJS.Worksheet): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value ?? '');
      });
      return;
    }

    if (rows.length >= MAX_ROWS_PER_SHEET) return;

    const obj: Record<string, unknown> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) obj[header] = cell.value;
    });
    rows.push(obj);
  });

  return rows;
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'number') return excelDateToISO(raw);
  if (raw instanceof Date) return raw.toISOString().split('T')[0]!;
  return String(raw);
}

/**
 * Parse a MacroFactor .xlsx export and import data into the database.
 * Wrapped in a transaction so partial failures roll back cleanly.
 */
export async function importMacroFactor(
  buffer: Buffer,
  userId: string,
): Promise<ImportSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const summary: ImportSummary = {
    intakeDays: 0,
    weightDays: 0,
    tdeeDays: 0,
    favoriteFoods: 0,
    historyFoods: 0,
    skipped: { intake: 0, weight: 0, tdee: 0, foods: 0 },
  };

  await db.transaction(async (tx) => {
    // ── Import Calories & Macros → daily_intake ──
    const macroSheet = workbook.getWorksheet('Calories & Macros');
    if (macroSheet) {
      const rows = sheetToRows(macroSheet);
      if (rows.length > MAX_ROWS_PER_SHEET) {
        throw new AppError(400, `Calories & Macros sheet exceeds ${MAX_ROWS_PER_SHEET} row limit`);
      }

      for (const row of rows) {
        const date = parseDate(row['Date']);
        if (!date) continue;

        const calories = Number(row['Calories (kcal)'] ?? row['Calories']) || 0;
        const protein = Number(row['Protein (g)'] ?? row['Protein']) || 0;
        const fat = Number(row['Fat (g)'] ?? row['Fat']) || 0;
        const carbs = Number(row['Carbs (g)'] ?? row['Carbs']) || 0;

        const existing = await tx
          .select({ id: dailyIntake.id })
          .from(dailyIntake)
          .where(and(eq(dailyIntake.userId, userId), eq(dailyIntake.date, date)))
          .limit(1);

        if (existing.length > 0) {
          summary.skipped.intake++;
          continue;
        }

        await tx.insert(dailyIntake).values({
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
    const weightSheet = workbook.getWorksheet('Scale Weight');
    if (weightSheet) {
      const rows = sheetToRows(weightSheet);
      if (rows.length > MAX_ROWS_PER_SHEET) {
        throw new AppError(400, `Scale Weight sheet exceeds ${MAX_ROWS_PER_SHEET} row limit`);
      }

      for (const row of rows) {
        const date = parseDate(row['Date']);
        if (!date) continue;

        const weight = Number(row['Weight (lbs)'] ?? row['Weight']) || 0;
        if (!weight) continue;

        const existing = await tx
          .select({ id: weightLog.id })
          .from(weightLog)
          .where(and(eq(weightLog.userId, userId), eq(weightLog.date, date)))
          .limit(1);

        if (existing.length > 0) {
          summary.skipped.weight++;
          continue;
        }

        await tx.insert(weightLog).values({ userId, date, weight: String(weight) });
        summary.weightDays++;
      }
    }

    // ── Import Expenditure → tdee_history ──
    const expenditureSheet = workbook.getWorksheet('Expenditure');
    const weightTrendSheet = workbook.getWorksheet('Weight Trend');

    // Build weight trend lookup
    const trendMap = new Map<string, number>();
    if (weightTrendSheet) {
      const trendRows = sheetToRows(weightTrendSheet);
      for (const row of trendRows) {
        const date = parseDate(row['Date']);
        if (!date) continue;
        const trend = Number(row['Weight Trend (lbs)'] ?? row['Weight Trend']) || 0;
        if (trend) trendMap.set(date, trend);
      }
    }

    if (expenditureSheet) {
      const rows = sheetToRows(expenditureSheet);
      if (rows.length > MAX_ROWS_PER_SHEET) {
        throw new AppError(400, `Expenditure sheet exceeds ${MAX_ROWS_PER_SHEET} row limit`);
      }

      for (const row of rows) {
        const date = parseDate(row['Date']);
        if (!date) continue;

        const tdee = Number(row['Expenditure (kcal)'] ?? row['Expenditure']) || 0;
        if (!tdee) continue;

        const existing = await tx
          .select({ id: tdeeHistory.id })
          .from(tdeeHistory)
          .where(and(eq(tdeeHistory.userId, userId), eq(tdeeHistory.date, date)))
          .limit(1);

        if (existing.length > 0) {
          summary.skipped.tdee++;
          continue;
        }

        const weightUsed = trendMap.get(date);
        await tx.insert(tdeeHistory).values({
          userId,
          date,
          tdeeEstimate: String(tdee),
          caloriesConsumed: '0',
          weightUsed: weightUsed ? String(weightUsed) : null,
        });
        summary.tdeeDays++;
      }
    }

    // ── Import Favorites → foods (with full macros) ──
    const favoritesSheet = workbook.getWorksheet('Favorites');
    if (favoritesSheet) {
      const rows = sheetToRows(favoritesSheet);
      if (rows.length > MAX_ROWS_PER_SHEET) {
        throw new AppError(400, `Favorites sheet exceeds ${MAX_ROWS_PER_SHEET} row limit`);
      }

      for (const row of rows) {
        const name = String(row['Name'] ?? row['Food Name'] ?? '').trim();
        if (!name) continue;

        const existing = await tx
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

        await tx.insert(foods).values({
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
    const historySheet = workbook.getWorksheet('History');
    if (historySheet) {
      const rows = sheetToRows(historySheet);
      if (rows.length > MAX_ROWS_PER_SHEET) {
        throw new AppError(400, `History sheet exceeds ${MAX_ROWS_PER_SHEET} row limit`);
      }

      for (const row of rows) {
        const name = String(row['Name'] ?? row['Food Name'] ?? '').trim();
        if (!name) continue;

        const existing = await tx
          .select({ id: foods.id })
          .from(foods)
          .where(and(eq(foods.userId, userId), eq(foods.name, name)))
          .limit(1);

        if (existing.length > 0) {
          summary.skipped.foods++;
          continue;
        }

        await tx.insert(foods).values({
          userId,
          name,
          category: 'other',
          source: 'imported_history',
        });
        summary.historyFoods++;
      }
    }
  });

  return summary;
}
