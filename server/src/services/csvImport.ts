import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { foods } from '../db/schema.js';

const csvRowSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  category: z.string().min(1).max(50).default('favorites'),
  emoji: z.string().max(10).optional(),
  servingLabel: z.string().max(100).optional(),
  servingGrams: z.coerce.number().min(0).max(99999).optional(),
  calories: z.coerce.number().min(0).max(99999).optional(),
  protein: z.coerce.number().min(0).max(99999).optional(),
  fat: z.coerce.number().min(0).max(99999).optional(),
  carbs: z.coerce.number().min(0).max(99999).optional(),
});

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export async function importCsvFoods(buffer: Buffer, userId: string): Promise<CsvImportResult> {
  // Strip BOM if present
  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const records: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (records.length === 0) {
    return { imported: 0, skipped: 0, errors: [{ row: 1, reason: 'File is empty or has no data rows' }] };
  }

  if (records.length > 5000) {
    return { imported: 0, skipped: 0, errors: [{ row: 0, reason: 'File exceeds maximum of 5000 rows' }] };
  }

  const validRows: Array<z.infer<typeof csvRowSchema>> = [];
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    // Map empty strings to undefined so defaults apply
    const cleaned: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(raw)) {
      cleaned[key.toLowerCase().trim()] = value === '' ? undefined : value;
    }

    const result = csvRowSchema.safeParse(cleaned);
    if (result.success) {
      validRows.push(result.data);
    } else {
      const reasons = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      errors.push({ row: i + 2, reason: reasons }); // +2 for 1-indexed + header row
    }
  }

  if (validRows.length > 0) {
    const insertValues = validRows.map((row) => ({
      name: row.name,
      emoji: row.emoji ?? null,
      category: row.category,
      servingLabel: row.servingLabel ?? null,
      servingGrams: row.servingGrams != null ? String(row.servingGrams) : null,
      calories: row.calories != null ? String(row.calories) : null,
      protein: row.protein != null ? String(row.protein) : null,
      fat: row.fat != null ? String(row.fat) : null,
      carbs: row.carbs != null ? String(row.carbs) : null,
      userId,
      source: 'manual' as const,
    }));

    await db.insert(foods).values(insertValues);
  }

  return {
    imported: validRows.length,
    skipped: errors.length,
    errors,
  };
}
