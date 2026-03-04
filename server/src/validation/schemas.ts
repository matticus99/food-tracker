import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format');

export const userUpdateSchema = z.object({
  age: z.number().int().min(1).max(150).nullish(),
  sex: z.enum(['male', 'female']).nullish(),
  heightInches: z.coerce.number().positive().max(120).nullish(),
  currentWeight: z.coerce.number().positive().max(1500).nullish(),
  objective: z.enum(['cut', 'maintain', 'bulk']).nullish(),
  activityLevel: z.coerce.number().min(1).max(3).nullish(),
  calorieTarget: z.number().int().min(0).max(50000).nullish(),
  proteinTarget: z.number().int().min(0).max(5000).nullish(),
  fatTarget: z.number().int().min(0).max(5000).nullish(),
  carbTarget: z.number().int().min(0).max(5000).nullish(),
  tdeeSmoothingFactor: z.coerce.number().min(0.01).max(1).nullish(),
}).strict();

export const foodCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  emoji: z.string().max(10).nullish(),
  category: z.enum(['favorites', 'proteins', 'grains', 'vegetables', 'fruits', 'dairy', 'snacks', 'drinks']).default('favorites'),
  servingLabel: z.string().max(100).nullish(),
  servingGrams: z.coerce.number().min(0).max(99999).nullish(),
  calories: z.coerce.number().min(0).max(99999).nullish(),
  protein: z.coerce.number().min(0).max(99999).nullish(),
  fat: z.coerce.number().min(0).max(99999).nullish(),
  carbs: z.coerce.number().min(0).max(99999).nullish(),
}).strict();

export const foodUpdateSchema = foodCreateSchema.partial();

export const foodLogCreateSchema = z.object({
  foodId: z.string().uuid('foodId must be a valid UUID'),
  date: dateString,
  timeHour: z.number().int().min(0).max(23),
  servings: z.coerce.number().positive().max(100).default(1),
}).strict();

export const foodLogUpdateSchema = z.object({
  servings: z.coerce.number().positive().max(100).optional(),
  timeHour: z.number().int().min(0).max(23).optional(),
  date: dateString.optional(),
}).strict();

export const weightCreateSchema = z.object({
  date: dateString,
  weight: z.coerce.number().positive().max(1500),
}).strict();

export const daysQuerySchema = z.coerce.number().int().positive().max(365).catch(14);
