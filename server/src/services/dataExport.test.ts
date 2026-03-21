import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted shared state (accessible inside vi.mock factories) ──────────────

const hoisted = vi.hoisted(() => {
  const state = { results: [] as unknown[][], callIndex: 0 };

  const chainable = () => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockImplementation(() => state.results[state.callIndex++] ?? []);
    chain.innerJoin = vi.fn().mockReturnValue(chain);
    return chain;
  };

  return { state, chainable };
});

vi.mock('../db/connection.js', () => ({
  db: { select: vi.fn().mockImplementation(() => hoisted.chainable()) },
}));
vi.mock('../db/schema.js', () => ({
  users: { id: 'users.id' },
  foods: { id: 'foods.id', userId: 'foods.userId', name: 'foods.name' },
  foodLog: { id: 'foodLog.id', foodId: 'foodLog.foodId', userId: 'foodLog.userId', servings: 'foodLog.servings', date: 'foodLog.date', timeHour: 'foodLog.timeHour' },
  weightLog: { id: 'weightLog.id', userId: 'weightLog.userId' },
  dailyIntake: { id: 'dailyIntake.id', userId: 'dailyIntake.userId' },
  tdeeHistory: { id: 'tdeeHistory.id', userId: 'tdeeHistory.userId' },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

import { exportData } from './dataExport.js';

beforeEach(() => {
  hoisted.state.results = [];
  hoisted.state.callIndex = 0;
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const fakeUser = {
  id: 'u1', username: 'test', passwordHash: 'x', role: 'user',
  age: 30, sex: 'male',
  heightInches: '70.5', currentWeight: '180.0',
  objective: 'lose', activityLevel: '1.50', goalPace: 1,
  proteinTarget: 150, fatTarget: 70, carbTarget: 200,
  tdeeSmoothingFactor: '0.100',
  categoryConfig: null,
};

const fakeFood1 = {
  id: 'f1', userId: 'u1', name: 'Chicken',
  emoji: '🍗', category: 'protein',
  servingLabel: '100g', servingGrams: '100',
  calories: '200.5', protein: '31', fat: '4.5', carbs: '0',
  source: 'manual',
};

const fakeFood2 = {
  id: 'f2', userId: 'u1', name: 'Rice',
  emoji: '🍚', category: 'carbs',
  servingLabel: '1 cup', servingGrams: '185',
  calories: '240', protein: '5', fat: '0.5', carbs: '53',
  source: 'manual',
};

const fakeLog = {
  id: 'l1', foodId: 'f1', date: '2026-03-20', timeHour: 12,
  servings: '1.5', foodName: 'Chicken',
};

const fakeWeight = { id: 'w1', userId: 'u1', date: '2026-03-20', weight: '180.0' };

const fakeIntake = {
  id: 'i1', userId: 'u1', date: '2026-03-20',
  calories: '2100', protein: '150', fat: '70', carbs: '200',
  source: 'logged',
};

const fakeTdee = {
  id: 't1', userId: 'u1', date: '2026-03-20',
  tdeeEstimate: '2400.5', caloriesConsumed: '2100', weightUsed: '180.0',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('exportData', () => {
  it('returns correctly structured export with all data', async () => {
    hoisted.state.results = [
      [fakeUser], [fakeFood1], [fakeLog], [fakeWeight], [fakeIntake], [fakeTdee],
    ];

    const result = await exportData('u1');

    expect(result.version).toBe(1);
    expect(result.appName).toBe('food-tracker');
    expect(result.exportedAt).toBeTruthy();
    expect(result.foods).toHaveLength(1);
    expect(result.foodLog).toHaveLength(1);
    expect(result.weightLog).toHaveLength(1);
    expect(result.dailyIntake).toHaveLength(1);
    expect(result.tdeeHistory).toHaveLength(1);
  });

  it('throws when user is not found', async () => {
    hoisted.state.results = [[], [], [], [], [], []];
    await expect(exportData('bad-id')).rejects.toThrow('User not found');
  });

  it('converts decimal string fields to numbers', async () => {
    hoisted.state.results = [[fakeUser], [fakeFood1], [], [], [], []];

    const result = await exportData('u1');

    expect(result.foods[0]!.calories).toBe(200.5);
    expect(typeof result.foods[0]!.calories).toBe('number');
    expect(result.user.heightInches).toBe(70.5);
    expect(result.user.activityLevel).toBe(1.5);
    expect(result.user.tdeeSmoothingFactor).toBe(0.1);
  });

  it('converts null decimal fields to null', async () => {
    const foodWithNulls = {
      ...fakeFood1,
      calories: null, protein: null, fat: null, carbs: null, servingGrams: null,
    };
    hoisted.state.results = [[fakeUser], [foodWithNulls], [], [], [], []];

    const result = await exportData('u1');

    expect(result.foods[0]!.calories).toBeNull();
    expect(result.foods[0]!.protein).toBeNull();
    expect(result.foods[0]!.servingGrams).toBeNull();
  });

  it('maps food DB IDs to sequential _exportId values', async () => {
    hoisted.state.results = [[fakeUser], [fakeFood1, fakeFood2], [], [], [], []];

    const result = await exportData('u1');

    expect(result.foods[0]!._exportId).toBe(1);
    expect(result.foods[1]!._exportId).toBe(2);
  });

  it('maps foodLog foodId to the correct foodExportId', async () => {
    const logForFood2 = { ...fakeLog, foodId: 'f2', foodName: 'Rice' };
    hoisted.state.results = [[fakeUser], [fakeFood1, fakeFood2], [fakeLog, logForFood2], [], [], []];

    const result = await exportData('u1');

    expect(result.foodLog[0]!.foodExportId).toBe(1);
    expect(result.foodLog[1]!.foodExportId).toBe(2);
  });

  it('returns foodExportId as null when food ID is not in the map', async () => {
    const orphanLog = { ...fakeLog, foodId: 'unknown-food-id' };
    hoisted.state.results = [[fakeUser], [fakeFood1], [orphanLog], [], [], []];

    const result = await exportData('u1');

    expect(result.foodLog[0]!.foodExportId).toBeNull();
  });

  it('returns empty arrays when user has no data', async () => {
    hoisted.state.results = [[fakeUser], [], [], [], [], []];

    const result = await exportData('u1');

    expect(result.foods).toEqual([]);
    expect(result.foodLog).toEqual([]);
    expect(result.weightLog).toEqual([]);
    expect(result.dailyIntake).toEqual([]);
    expect(result.tdeeHistory).toEqual([]);
    expect(result.user.age).toBe(30);
  });
});
