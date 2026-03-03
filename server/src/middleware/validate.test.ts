import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate, AppError } from './errorHandler.js';

describe('validate', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it('returns parsed data for valid input', () => {
    const result = validate(testSchema, { name: 'Alice', age: 30 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('throws AppError with 400 status for invalid input', () => {
    try {
      validate(testSchema, { name: '', age: -1 });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
      expect((err as AppError).message).toContain('Validation error');
    }
  });

  it('includes field path in error message', () => {
    try {
      validate(testSchema, { name: 'Valid', age: 'not-a-number' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as AppError).message).toContain('age');
    }
  });

  it('includes multiple errors', () => {
    try {
      validate(testSchema, {});
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as AppError).message).toContain('name');
      expect((err as AppError).message).toContain('age');
    }
  });

  it('rethrows non-Zod errors', () => {
    const badSchema = {
      parse: () => { throw new Error('Not a ZodError'); },
    } as unknown as z.ZodSchema;

    expect(() => validate(badSchema, {})).toThrow('Not a ZodError');
  });
});
