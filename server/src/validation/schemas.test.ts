import { describe, it, expect } from 'vitest';
import {
  userUpdateSchema,
  foodCreateSchema,
  foodUpdateSchema,
  foodLogCreateSchema,
  foodLogUpdateSchema,
  weightCreateSchema,
  daysQuerySchema,
  validateDateParam,
  validateUuidParam,
} from './schemas.js';

// ── userUpdateSchema ────────────────────────────────────────────────────────

describe('userUpdateSchema', () => {
  it('accepts valid full update', () => {
    const result = userUpdateSchema.parse({
      age: 30,
      sex: 'male',
      heightInches: 70,
      currentWeight: 185.5,
      objective: 'cut',
      activityLevel: 1.5,
      goalPace: 500,
      proteinTarget: 150,
      fatTarget: 65,
      carbTarget: 250,
      tdeeSmoothingFactor: 0.1,
    });
    expect(result.age).toBe(30);
    expect(result.heightInches).toBe(70);
    expect(result.currentWeight).toBe(185.5);
    expect(result.tdeeSmoothingFactor).toBe(0.1);
  });

  it('accepts partial update (empty object)', () => {
    const result = userUpdateSchema.parse({});
    expect(result).toEqual({});
  });

  it('rejects age out of range', () => {
    expect(() => userUpdateSchema.parse({ age: 0 })).toThrow();
    expect(() => userUpdateSchema.parse({ age: 151 })).toThrow();
    expect(() => userUpdateSchema.parse({ age: -5 })).toThrow();
  });

  it('rejects invalid sex enum', () => {
    expect(() => userUpdateSchema.parse({ sex: 'other' })).toThrow();
  });

  it('rejects invalid objective enum', () => {
    expect(() => userUpdateSchema.parse({ objective: 'shred' })).toThrow();
  });

  it('rejects negative weight', () => {
    expect(() => userUpdateSchema.parse({ currentWeight: -100 })).toThrow();
  });

  it('rejects weight above maximum', () => {
    expect(() => userUpdateSchema.parse({ currentWeight: 1501 })).toThrow();
  });

  it('rejects string values for numeric fields (no coercion)', () => {
    expect(() => userUpdateSchema.parse({ heightInches: '70' })).toThrow();
    expect(() => userUpdateSchema.parse({ currentWeight: '185' })).toThrow();
    expect(() => userUpdateSchema.parse({ activityLevel: '1.5' })).toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() => userUpdateSchema.parse({ id: 'hacked-uuid' })).toThrow();
    expect(() => userUpdateSchema.parse({ createdAt: '2000-01-01' })).toThrow();
  });

  it('rejects goalPace out of range', () => {
    expect(() => userUpdateSchema.parse({ goalPace: 50 })).toThrow();
    expect(() => userUpdateSchema.parse({ goalPace: 2000 })).toThrow();
  });

  it('rejects smoothing factor out of range', () => {
    expect(() => userUpdateSchema.parse({ tdeeSmoothingFactor: 0 })).toThrow();
    expect(() => userUpdateSchema.parse({ tdeeSmoothingFactor: 1.1 })).toThrow();
  });

  it('rejects Infinity and NaN for numeric fields', () => {
    expect(() => userUpdateSchema.parse({ heightInches: Infinity })).toThrow();
    expect(() => userUpdateSchema.parse({ currentWeight: NaN })).toThrow();
    expect(() => userUpdateSchema.parse({ tdeeSmoothingFactor: -Infinity })).toThrow();
  });
});

// ── foodCreateSchema ────────────────────────────────────────────────────────

describe('foodCreateSchema', () => {
  it('accepts valid food with all fields', () => {
    const result = foodCreateSchema.parse({
      name: 'Chicken Breast',
      emoji: '🍗',
      category: 'proteins',
      servingLabel: '4 oz',
      servingGrams: 113,
      calories: 165,
      protein: 31,
      fat: 3.6,
      carbs: 0,
    });
    expect(result.name).toBe('Chicken Breast');
    expect(result.calories).toBe(165);
  });

  it('accepts minimal food (name only)', () => {
    const result = foodCreateSchema.parse({ name: 'Test Food' });
    expect(result.name).toBe('Test Food');
    expect(result.category).toBe('favorites');
  });

  it('rejects empty name', () => {
    expect(() => foodCreateSchema.parse({ name: '' })).toThrow();
  });

  it('rejects missing name', () => {
    expect(() => foodCreateSchema.parse({ category: 'dairy' })).toThrow();
  });

  it('rejects name over 255 chars', () => {
    expect(() => foodCreateSchema.parse({ name: 'a'.repeat(256) })).toThrow();
  });

  it('rejects category over 50 chars', () => {
    expect(() => foodCreateSchema.parse({ name: 'X', category: 'a'.repeat(51) })).toThrow();
  });

  it('rejects empty category', () => {
    expect(() => foodCreateSchema.parse({ name: 'X', category: '' })).toThrow();
  });

  it('accepts any valid category string', () => {
    const result = foodCreateSchema.parse({ name: 'X', category: 'custom_cat' });
    expect(result.category).toBe('custom_cat');
  });

  it('rejects negative calories', () => {
    expect(() => foodCreateSchema.parse({ name: 'X', calories: -10 })).toThrow();
  });

  it('rejects extra fields (strict mode prevents mass assignment)', () => {
    expect(() => foodCreateSchema.parse({
      name: 'X',
      id: 'hacked-uuid',
    })).toThrow();
    expect(() => foodCreateSchema.parse({
      name: 'X',
      userId: 'hacked-uuid',
    })).toThrow();
  });

  it('rejects string values for numeric fields (no coercion)', () => {
    expect(() => foodCreateSchema.parse({
      name: 'Rice',
      calories: '200',
    })).toThrow();
  });

  it('rejects Infinity for numeric fields', () => {
    expect(() => foodCreateSchema.parse({
      name: 'Rice',
      calories: Infinity,
    })).toThrow();
  });
});

// ── foodUpdateSchema ────────────────────────────────────────────────────────

describe('foodUpdateSchema', () => {
  it('accepts partial updates', () => {
    const result = foodUpdateSchema.parse({ calories: 200 });
    expect(result.calories).toBe(200);
    expect(result.name).toBeUndefined();
  });

  it('accepts empty update', () => {
    const result = foodUpdateSchema.parse({});
    // category has a default in foodCreateSchema, so it persists in partial
    expect(result.name).toBeUndefined();
    expect(result.calories).toBeUndefined();
  });

  it('rejects extra fields', () => {
    expect(() => foodUpdateSchema.parse({ userId: 'x' })).toThrow();
  });
});

// ── foodLogCreateSchema ─────────────────────────────────────────────────────

describe('foodLogCreateSchema', () => {
  it('accepts valid log entry', () => {
    const result = foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-03-01',
      timeHour: 12,
      servings: 1.5,
    });
    expect(result.foodId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.servings).toBe(1.5);
  });

  it('defaults servings to 1', () => {
    const result = foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-03-01',
      timeHour: 12,
    });
    expect(result.servings).toBe(1);
  });

  it('rejects non-UUID foodId', () => {
    expect(() => foodLogCreateSchema.parse({
      foodId: 'not-a-uuid',
      date: '2024-03-01',
      timeHour: 12,
    })).toThrow('UUID');
  });

  it('rejects invalid date format', () => {
    expect(() => foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: 'March 1st',
      timeHour: 12,
    })).toThrow();
  });

  it('rejects timeHour out of range', () => {
    expect(() => foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-03-01',
      timeHour: -1,
    })).toThrow();

    expect(() => foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-03-01',
      timeHour: 24,
    })).toThrow();
  });

  it('rejects zero servings', () => {
    expect(() => foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-03-01',
      timeHour: 12,
      servings: 0,
    })).toThrow();
  });

  it('rejects negative servings', () => {
    expect(() => foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-03-01',
      timeHour: 12,
      servings: -1,
    })).toThrow();
  });

  it('rejects extra fields (prevents mass assignment)', () => {
    expect(() => foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-03-01',
      timeHour: 12,
      userId: 'hacked',
    })).toThrow();
  });

  it('rejects servings over 100', () => {
    expect(() => foodLogCreateSchema.parse({
      foodId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-03-01',
      timeHour: 12,
      servings: 101,
    })).toThrow();
  });
});

// ── foodLogUpdateSchema ─────────────────────────────────────────────────────

describe('foodLogUpdateSchema', () => {
  it('accepts partial update', () => {
    const result = foodLogUpdateSchema.parse({ servings: 2 });
    expect(result.servings).toBe(2);
  });

  it('accepts empty update', () => {
    const result = foodLogUpdateSchema.parse({});
    expect(result).toEqual({});
  });

  it('rejects extra fields', () => {
    expect(() => foodLogUpdateSchema.parse({ id: 'x' })).toThrow();
    expect(() => foodLogUpdateSchema.parse({ userId: 'x' })).toThrow();
    expect(() => foodLogUpdateSchema.parse({ foodId: '550e8400-e29b-41d4-a716-446655440000' })).toThrow();
  });

  it('rejects negative servings', () => {
    expect(() => foodLogUpdateSchema.parse({ servings: -5 })).toThrow();
  });
});

// ── weightCreateSchema ──────────────────────────────────────────────────────

describe('weightCreateSchema', () => {
  it('accepts valid weight', () => {
    const result = weightCreateSchema.parse({
      date: '2024-03-01',
      weight: 185.5,
    });
    expect(result.date).toBe('2024-03-01');
    expect(result.weight).toBe(185.5);
  });

  it('rejects missing date', () => {
    expect(() => weightCreateSchema.parse({ weight: 180 })).toThrow();
  });

  it('rejects missing weight', () => {
    expect(() => weightCreateSchema.parse({ date: '2024-03-01' })).toThrow();
  });

  it('rejects invalid date format', () => {
    expect(() => weightCreateSchema.parse({
      date: 'not-a-date',
      weight: 180,
    })).toThrow();
  });

  it('rejects zero weight', () => {
    expect(() => weightCreateSchema.parse({
      date: '2024-03-01',
      weight: 0,
    })).toThrow();
  });

  it('rejects negative weight', () => {
    expect(() => weightCreateSchema.parse({
      date: '2024-03-01',
      weight: -100,
    })).toThrow();
  });

  it('rejects weight above 1500', () => {
    expect(() => weightCreateSchema.parse({
      date: '2024-03-01',
      weight: 1501,
    })).toThrow();
  });

  it('rejects extra fields', () => {
    expect(() => weightCreateSchema.parse({
      date: '2024-03-01',
      weight: 180,
      id: 'x',
    })).toThrow();
  });

  it('rejects string weight (no coercion)', () => {
    expect(() => weightCreateSchema.parse({
      date: '2024-03-01',
      weight: '185',
    })).toThrow();
  });

  it('rejects Infinity weight', () => {
    expect(() => weightCreateSchema.parse({
      date: '2024-03-01',
      weight: Infinity,
    })).toThrow();
  });
});

// ── daysQuerySchema ─────────────────────────────────────────────────────────

describe('daysQuerySchema', () => {
  it('parses valid number', () => {
    expect(daysQuerySchema.parse(14)).toBe(14);
    expect(daysQuerySchema.parse('30')).toBe(30);
  });

  it('defaults to 14 for invalid input', () => {
    expect(daysQuerySchema.parse('abc')).toBe(14);
    expect(daysQuerySchema.parse(null)).toBe(14);
    expect(daysQuerySchema.parse(undefined)).toBe(14);
  });

  it('defaults to 14 for negative numbers', () => {
    expect(daysQuerySchema.parse(-1)).toBe(14);
  });

  it('defaults to 14 for numbers above 365', () => {
    expect(daysQuerySchema.parse(366)).toBe(14);
  });

  it('accepts boundary values', () => {
    expect(daysQuerySchema.parse(1)).toBe(1);
    expect(daysQuerySchema.parse(365)).toBe(365);
  });

  it('defaults to 14 for zero', () => {
    expect(daysQuerySchema.parse(0)).toBe(14);
  });

  it('defaults to 14 for float', () => {
    expect(daysQuerySchema.parse(3.5)).toBe(14);
  });
});

// ── validateDateParam ─────────────────────────────────────────────────────

describe('validateDateParam', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    expect(validateDateParam('2024-03-01')).toBe('2024-03-01');
    expect(validateDateParam('2024-12-31')).toBe('2024-12-31');
    expect(validateDateParam('2000-01-01')).toBe('2000-01-01');
  });

  it('throws AppError(400) for empty/missing values', () => {
    expect(() => validateDateParam(undefined)).toThrow('must be a valid date');
    expect(() => validateDateParam(null)).toThrow('must be a valid date');
    expect(() => validateDateParam('')).toThrow('must be a valid date');
  });

  it('throws AppError(400) for invalid date formats', () => {
    expect(() => validateDateParam('notadate')).toThrow('must be a valid date');
    expect(() => validateDateParam('03-01-2024')).toThrow('must be a valid date');
    expect(() => validateDateParam('2024/03/01')).toThrow('must be a valid date');
    expect(() => validateDateParam('2024-3-1')).toThrow('must be a valid date');
    expect(() => validateDateParam('March 1, 2024')).toThrow('must be a valid date');
  });

  it('throws AppError(400) for non-string types', () => {
    expect(() => validateDateParam(12345)).toThrow('must be a valid date');
    expect(() => validateDateParam(true)).toThrow('must be a valid date');
    expect(() => validateDateParam({})).toThrow('must be a valid date');
  });

  it('includes custom parameter name in error message', () => {
    expect(() => validateDateParam('bad', 'from')).toThrow('from must be a valid date');
  });
});

// ── validateUuidParam ─────────────────────────────────────────────────────

describe('validateUuidParam', () => {
  it('accepts valid UUIDs', () => {
    expect(validateUuidParam('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(validateUuidParam('A550E840-E29B-41D4-A716-446655440000')).toBe('A550E840-E29B-41D4-A716-446655440000');
  });

  it('throws AppError(400) for non-UUID strings', () => {
    expect(() => validateUuidParam('not-a-uuid')).toThrow('must be a valid UUID');
    expect(() => validateUuidParam('12345')).toThrow('must be a valid UUID');
    expect(() => validateUuidParam('')).toThrow('must be a valid UUID');
    expect(() => validateUuidParam('550e8400e29b41d4a716446655440000')).toThrow('must be a valid UUID'); // no dashes
  });

  it('includes custom parameter name in error message', () => {
    expect(() => validateUuidParam('bad', 'foodId')).toThrow('foodId must be a valid UUID');
  });
});
