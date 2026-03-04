import {
  pgTable,
  uuid,
  integer,
  varchar,
  decimal,
  date,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ── Enums ──
export const sexEnum = pgEnum('sex', ['male', 'female']);
export const objectiveEnum = pgEnum('objective', ['cut', 'maintain', 'bulk']);
export const foodCategoryEnum = pgEnum('food_category', [
  'favorites', 'proteins', 'grains', 'vegetables', 'fruits', 'dairy', 'snacks', 'drinks',
]);
export const foodSourceEnum = pgEnum('food_source', [
  'manual', 'imported_favorite', 'imported_history',
]);
export const intakeSourceEnum = pgEnum('intake_source', ['logged', 'imported']);

// ── Users ──
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  age: integer('age'),
  sex: sexEnum('sex'),
  heightInches: decimal('height_inches', { precision: 5, scale: 1 }),
  currentWeight: decimal('current_weight', { precision: 5, scale: 1 }),
  objective: objectiveEnum('objective').default('maintain'),
  activityLevel: decimal('activity_level', { precision: 4, scale: 2 }).default('1.25'),
  calorieTarget: integer('calorie_target'),
  proteinTarget: integer('protein_target'),
  fatTarget: integer('fat_target'),
  carbTarget: integer('carb_target'),
  tdeeSmoothingFactor: decimal('tdee_smoothing_factor', { precision: 4, scale: 3 }).default('0.100'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Foods ──
export const foods = pgTable('foods', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  emoji: varchar('emoji', { length: 10 }),
  category: foodCategoryEnum('category').default('favorites').notNull(),
  servingLabel: varchar('serving_label', { length: 100 }),
  servingGrams: decimal('serving_grams', { precision: 7, scale: 1 }),
  calories: decimal('calories', { precision: 7, scale: 1 }),
  protein: decimal('protein', { precision: 7, scale: 1 }),
  fat: decimal('fat', { precision: 7, scale: 1 }),
  carbs: decimal('carbs', { precision: 7, scale: 1 }),
  source: foodSourceEnum('source').default('manual').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('foods_user_id_idx').on(table.userId),
]);

// ── Food Log ──
export const foodLog = pgTable('food_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  foodId: uuid('food_id').references(() => foods.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  timeHour: integer('time_hour').notNull(),
  servings: decimal('servings', { precision: 5, scale: 2 }).default('1').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('food_log_user_id_idx').on(table.userId),
  index('food_log_food_id_idx').on(table.foodId),
  index('food_log_user_date_idx').on(table.userId, table.date),
]);

// ── Daily Intake (imported or aggregated) ──
export const dailyIntake = pgTable('daily_intake', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  calories: decimal('calories', { precision: 7, scale: 1 }).notNull(),
  protein: decimal('protein', { precision: 7, scale: 1 }).notNull(),
  fat: decimal('fat', { precision: 7, scale: 1 }).notNull(),
  carbs: decimal('carbs', { precision: 7, scale: 1 }).notNull(),
  source: intakeSourceEnum('source').default('logged').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('daily_intake_user_date_idx').on(table.userId, table.date),
  index('daily_intake_user_id_idx').on(table.userId),
]);

// ── Weight Log ──
export const weightLog = pgTable('weight_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  weight: decimal('weight', { precision: 5, scale: 1 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('weight_log_user_date_idx').on(table.userId, table.date),
  index('weight_log_user_id_idx').on(table.userId),
]);

// ── TDEE History ──
export const tdeeHistory = pgTable('tdee_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  tdeeEstimate: decimal('tdee_estimate', { precision: 7, scale: 1 }).notNull(),
  caloriesConsumed: decimal('calories_consumed', { precision: 7, scale: 1 }).notNull(),
  weightUsed: decimal('weight_used', { precision: 5, scale: 1 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('tdee_history_user_date_idx').on(table.userId, table.date),
  index('tdee_history_user_id_idx').on(table.userId),
]);
