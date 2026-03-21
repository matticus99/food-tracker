import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateString = z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD format');

/** Validate a date query parameter, throwing AppError(400) if invalid. */
export function validateDateParam(value: unknown, name = 'date'): string {
  if (!value || typeof value !== 'string' || !DATE_REGEX.test(value)) {
    throw new AppError(400, `${name} must be a valid date (YYYY-MM-DD)`);
  }
  return value;
}

/** Validate a UUID path parameter, throwing AppError(400) if invalid. */
export function validateUuidParam(value: string, name = 'id'): string {
  if (!UUID_REGEX.test(value)) {
    throw new AppError(400, `${name} must be a valid UUID`);
  }
  return value;
}

const categoryConfigSchema = z.object({
  labels: z.record(z.string(), z.string().min(1).max(30)).optional(),
  pinnedCategories: z.array(z.string()).max(2).optional(),
  customCategories: z.array(z.string().min(1).max(50)).max(15).optional(),
}).nullish();

export const userUpdateSchema = z.object({
  age: z.number().int().min(1).max(150).nullish(),
  sex: z.enum(['male', 'female']).nullish(),
  heightInches: z.number().finite().positive().max(120).nullish(),
  currentWeight: z.number().finite().positive().max(1500).nullish(),
  objective: z.enum(['cut', 'maintain', 'bulk']).nullish(),
  activityLevel: z.number().finite().min(1).max(3).nullish(),
  goalPace: z.number().int().min(125).max(1500).nullish(),
  proteinTarget: z.number().int().min(0).max(5000).nullish(),
  fatTarget: z.number().int().min(0).max(5000).nullish(),
  carbTarget: z.number().int().min(0).max(5000).nullish(),
  tdeeSmoothingFactor: z.number().finite().min(0.01).max(1).nullish(),
  categoryConfig: categoryConfigSchema,
}).strict();

export const foodCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  emoji: z.string().max(10).nullish(),
  category: z.string().min(1).max(50).default('favorites'),
  servingLabel: z.string().max(100).nullish(),
  servingGrams: z.number().finite().min(0).max(99999).nullish(),
  calories: z.number().finite().min(0).max(99999).nullish(),
  protein: z.number().finite().min(0).max(99999).nullish(),
  fat: z.number().finite().min(0).max(99999).nullish(),
  carbs: z.number().finite().min(0).max(99999).nullish(),
}).strict();

export const foodUpdateSchema = foodCreateSchema.partial();

export const foodLogCreateSchema = z.object({
  foodId: z.string().uuid('foodId must be a valid UUID'),
  date: dateString,
  timeHour: z.number().int().min(0).max(23),
  servings: z.number().finite().positive().max(100).default(1),
}).strict();

export const foodLogUpdateSchema = z.object({
  servings: z.number().finite().positive().max(100).optional(),
  timeHour: z.number().int().min(0).max(23).optional(),
  date: dateString.optional(),
}).strict();

export const weightCreateSchema = z.object({
  date: dateString,
  weight: z.number().finite().positive().max(1500),
}).strict();

export const daysQuerySchema = z.coerce.number().int().positive().max(365).catch(14);
