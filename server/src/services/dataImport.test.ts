import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted shared state ────────────────────────────────────────────────────

const hoisted = vi.hoisted(() => {
  const state = {
    selectResults: [] as unknown[][],
    selectIdx: 0,
    insertResults: [] as unknown[][],
    insertIdx: 0,
  };

  const txUpdateSet = vi.fn();
  const txUpdateWhere = vi.fn();

  function makeTx() {
    state.selectIdx = 0;
    state.insertIdx = 0;
    txUpdateSet.mockReset();
    txUpdateWhere.mockReset();
    txUpdateSet.mockReturnValue({ where: txUpdateWhere });

    return {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => state.selectResults[state.selectIdx++] ?? []),
          }),
        }),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(() => state.insertResults[state.insertIdx++] ?? [{ id: `new-${state.insertIdx}` }]),
        }),
      })),
      update: vi.fn().mockReturnValue({ set: txUpdateSet }),
    };
  }

  let currentTx = makeTx();

  return { state, txUpdateSet, makeTx, getCurrentTx: () => currentTx, setTx: (tx: ReturnType<typeof makeTx>) => { currentTx = tx; } };
});

vi.mock('../db/connection.js', () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(hoisted.getCurrentTx())),
  },
}));
vi.mock('../db/schema.js', () => ({
  users: { id: 'users.id' },
  foods: { id: 'foods.id', userId: 'foods.userId', name: 'foods.name', category: 'foods.category' },
  foodLog: { id: 'foodLog.id', userId: 'foodLog.userId', foodId: 'foodLog.foodId', date: 'foodLog.date', timeHour: 'foodLog.timeHour' },
  weightLog: { id: 'weightLog.id', userId: 'weightLog.userId', date: 'weightLog.date' },
  dailyIntake: { id: 'dailyIntake.id', userId: 'dailyIntake.userId', date: 'dailyIntake.date' },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock('../middleware/errorHandler.js', async () => {
  class AppError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { AppError };
});
vi.mock('../middleware/userMiddleware.js', () => ({
  invalidateUserCache: vi.fn(),
}));

import { importData } from './dataImport.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const validPayload = (overrides?: Record<string, unknown>) => ({
  version: 1,
  appName: 'food-tracker',
  foods: [],
  foodLog: [],
  weightLog: [],
  ...overrides,
});

beforeEach(() => {
  hoisted.state.selectResults = [];
  hoisted.state.insertResults = [];
  const tx = hoisted.makeTx();
  hoisted.setTx(tx);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('importData', () => {
  // ── Validation ──

  describe('validation', () => {
    it('throws 400 for null input', async () => {
      await expect(importData(null, 'u1')).rejects.toThrow('not a JSON object');
    });

    it('throws 400 for non-object input', async () => {
      await expect(importData('string', 'u1')).rejects.toThrow('not a JSON object');
    });

    it('throws 400 for wrong version', async () => {
      await expect(importData({ ...validPayload(), version: 2 }, 'u1'))
        .rejects.toThrow('Unsupported export version');
    });

    it('throws 400 for wrong appName', async () => {
      await expect(importData({ ...validPayload(), appName: 'other' }, 'u1'))
        .rejects.toThrow('not a food-tracker export');
    });

    it('throws 400 when foods is not an array', async () => {
      await expect(importData({ ...validPayload(), foods: 'bad' }, 'u1'))
        .rejects.toThrow('missing foods array');
    });

    it('throws 400 when foodLog is not an array', async () => {
      await expect(importData({ ...validPayload(), foodLog: null }, 'u1'))
        .rejects.toThrow('missing foodLog array');
    });

    it('throws 400 when weightLog is not an array', async () => {
      await expect(importData({ ...validPayload(), weightLog: 123 }, 'u1'))
        .rejects.toThrow('missing weightLog array');
    });
  });

  describe('size limits', () => {
    it('throws 400 when foods exceeds 5000', async () => {
      const payload = validPayload({ foods: new Array(5001).fill({ name: 'x' }) });
      await expect(importData(payload, 'u1')).rejects.toThrow('exceeds 5000 limit');
    });

    it('throws 400 when foodLog exceeds 50000', async () => {
      const payload = validPayload({ foodLog: new Array(50001).fill({ date: 'x' }) });
      await expect(importData(payload, 'u1')).rejects.toThrow('exceeds 50000 limit');
    });

    it('throws 400 when weightLog exceeds 5000', async () => {
      const payload = validPayload({ weightLog: new Array(5001).fill({ date: 'x' }) });
      await expect(importData(payload, 'u1')).rejects.toThrow('exceeds 5000 limit');
    });
  });

  // ── User profile ──

  describe('user profile', () => {
    it('updates user when profile has non-null fields', async () => {
      const payload = validPayload({ user: { age: 30, sex: 'male' } });
      const result = await importData(payload, 'u1');

      expect(result.userUpdated).toBe(true);
      expect(hoisted.txUpdateSet).toHaveBeenCalled();
    });

    it('skips update when user is missing', async () => {
      const result = await importData(validPayload(), 'u1');

      expect(result.userUpdated).toBe(false);
      expect(hoisted.getCurrentTx().update).not.toHaveBeenCalled();
    });

    it('skips update when user object has no non-null fields', async () => {
      const payload = validPayload({ user: {} });
      const result = await importData(payload, 'u1');

      expect(result.userUpdated).toBe(false);
    });
  });

  // ── Foods ──

  describe('foods', () => {
    it('inserts new foods and returns correct count', async () => {
      hoisted.state.selectResults = [[]]; // no existing food
      hoisted.state.insertResults = [[{ id: 'new-f1' }]];
      const payload = validPayload({
        foods: [{ _exportId: 1, name: 'Chicken', category: 'protein', calories: 200 }],
      });

      const result = await importData(payload, 'u1');

      expect(result.foodsInserted).toBe(1);
      expect(result.foodsSkipped).toBe(0);
      expect(hoisted.getCurrentTx().insert).toHaveBeenCalled();
    });

    it('skips duplicate foods by name+category', async () => {
      hoisted.state.selectResults = [[{ id: 'existing-f1' }]]; // existing food found
      const payload = validPayload({
        foods: [{ _exportId: 1, name: 'Chicken', category: 'protein' }],
      });

      const result = await importData(payload, 'u1');

      expect(result.foodsInserted).toBe(0);
      expect(result.foodsSkipped).toBe(1);
    });

    it('skips foods with empty name', async () => {
      const payload = validPayload({
        foods: [{ _exportId: 1, name: '', category: 'protein' }],
      });

      const result = await importData(payload, 'u1');

      expect(result.foodsInserted).toBe(0);
      expect(result.foodsSkipped).toBe(0);
    });
  });

  // ── Food Log ──

  describe('foodLog', () => {
    it('inserts log entries using exportId mapping', async () => {
      hoisted.state.selectResults = [
        [],  // food dedup check → not found, so insert
        [],  // foodLog dedup check → not found, so insert
      ];
      hoisted.state.insertResults = [[{ id: 'new-f1' }]];

      const payload = validPayload({
        foods: [{ _exportId: 1, name: 'Chicken', category: 'protein' }],
        foodLog: [{ date: '2026-03-20', timeHour: 12, servings: 1, foodExportId: 1, foodName: 'Chicken' }],
      });

      const result = await importData(payload, 'u1');

      expect(result.foodLogInserted).toBe(1);
    });

    it('skips log entries when food cannot be resolved', async () => {
      const payload = validPayload({
        foodLog: [{ date: '2026-03-20', timeHour: 12, foodExportId: 999, foodName: 'Unknown' }],
      });

      const result = await importData(payload, 'u1');

      expect(result.foodLogSkipped).toBe(1);
      expect(result.foodLogInserted).toBe(0);
    });

    it('skips log entries with empty date', async () => {
      const payload = validPayload({
        foodLog: [{ date: '', foodExportId: 1 }],
      });

      const result = await importData(payload, 'u1');

      expect(result.foodLogInserted).toBe(0);
    });
  });

  // ── Weight Log ──

  describe('weightLog', () => {
    it('inserts new weight entries', async () => {
      hoisted.state.selectResults = [[]]; // no existing
      const payload = validPayload({
        weightLog: [{ date: '2026-03-20', weight: 180 }],
      });

      const result = await importData(payload, 'u1');

      expect(result.weightInserted).toBe(1);
      expect(result.weightUpdated).toBe(0);
    });

    it('updates existing weight entries (upsert)', async () => {
      hoisted.state.selectResults = [[{ id: 'existing-w1' }]]; // existing found
      const payload = validPayload({
        weightLog: [{ date: '2026-03-20', weight: 181 }],
      });

      const result = await importData(payload, 'u1');

      expect(result.weightUpdated).toBe(1);
      expect(result.weightInserted).toBe(0);
    });

    it('skips entries with empty date or zero weight', async () => {
      const payload = validPayload({
        weightLog: [
          { date: '', weight: 180 },
          { date: '2026-03-20', weight: 0 },
        ],
      });

      const result = await importData(payload, 'u1');

      expect(result.weightInserted).toBe(0);
      expect(result.weightUpdated).toBe(0);
    });
  });

  // ── Daily Intake ──

  describe('dailyIntake', () => {
    it('imports only entries with source "imported"', async () => {
      hoisted.state.selectResults = [[]]; // no existing
      const payload = validPayload({
        dailyIntake: [
          { date: '2026-03-20', calories: 2100, source: 'imported' },
          { date: '2026-03-21', calories: 2000, source: 'logged' },
        ],
      });

      const result = await importData(payload, 'u1');

      expect(result.importedIntakeDays).toBe(1);
    });

    it('skips dates that already exist', async () => {
      hoisted.state.selectResults = [[{ id: 'existing-i1' }]]; // existing found
      const payload = validPayload({
        dailyIntake: [{ date: '2026-03-20', calories: 2100, source: 'imported' }],
      });

      const result = await importData(payload, 'u1');

      expect(result.importedIntakeDays).toBe(0);
    });

    it('handles missing dailyIntake array gracefully', async () => {
      const payload = validPayload();
      delete (payload as Record<string, unknown>).dailyIntake;

      const result = await importData(payload, 'u1');

      expect(result.importedIntakeDays).toBe(0);
    });
  });

  // ── Summary ──

  describe('summary', () => {
    it('returns all zero counts for empty arrays', async () => {
      const result = await importData(validPayload(), 'u1');

      expect(result).toEqual({
        userUpdated: false,
        foodsInserted: 0,
        foodsSkipped: 0,
        foodLogInserted: 0,
        foodLogSkipped: 0,
        weightInserted: 0,
        weightUpdated: 0,
        importedIntakeDays: 0,
      });
    });
  });
});
