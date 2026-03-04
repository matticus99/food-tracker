# Database Schema — Fuel Food Tracker

**Database:** PostgreSQL 16
**ORM:** Drizzle ORM 0.39
**Schema File:** `server/src/db/schema.ts`

---

## 1. Entity Relationship Diagram

```
┌──────────────────────────┐
│         users            │
│──────────────────────────│
│ id (PK, UUID)            │
│ age, sex, heightInches   │
│ currentWeight, objective │
│ activityLevel            │
│ calorieTarget            │
│ proteinTarget            │
│ fatTarget, carbTarget    │
│ tdeeSmoothingFactor      │
│ createdAt, updatedAt     │
└──────────┬───────────────┘
           │ 1:many
     ┌─────┼─────┬──────────┬──────────┐
     │     │     │          │          │
     ▼     ▼     ▼          ▼          ▼
┌────────┐┌────────┐┌───────────┐┌──────────┐┌───────────┐
│ foods  ││foodLog ││dailyIntake││weightLog ││tdeeHistory│
│        ││        ││           ││          ││           │
│ id(PK) ││ id(PK) ││ id (PK)   ││ id (PK)  ││ id (PK)   │
│ userId ││ userId ││ userId    ││ userId   ││ userId    │
│ name   ││ foodId ││ date (UQ) ││ date(UQ) ││ date (UQ) │
│ macros ││ date   ││ calories  ││ weight   ││ tdeeEst.  │
│ ...    ││ hour   ││ macros    ││          ││ calories  │
│        ││servings││ source    ││          ││ weightUsed│
└────────┘└───┬────┘└───────────┘└──────────┘└───────────┘
              │
              │ many:1
              ▼
         ┌────────┐
         │ foods  │
         └────────┘
```

---

## 2. Enums

### `sex`
```sql
CREATE TYPE sex AS ENUM ('male', 'female');
```

### `objective`
```sql
CREATE TYPE objective AS ENUM ('cut', 'maintain', 'bulk');
```

### `foodCategory`
```sql
CREATE TYPE food_category AS ENUM (
  'proteins', 'grains', 'vegetables', 'fruits',
  'dairy', 'snacks', 'drinks', 'other'
);
```

### `foodSource`
```sql
CREATE TYPE food_source AS ENUM ('manual', 'imported_favorite', 'imported_history');
```

### `intakeSource`
```sql
CREATE TYPE intake_source AS ENUM ('logged', 'imported');
```

---

## 3. Tables

### 3.1 `users`

Primary user profile and configuration.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `age` | integer | Yes | — | — |
| `sex` | sex enum | Yes | — | — |
| `heightInches` | decimal(5,1) | Yes | — | — |
| `currentWeight` | decimal(5,1) | Yes | — | — |
| `objective` | objective enum | Yes | `'maintain'` | — |
| `activityLevel` | decimal(4,2) | Yes | `'1.25'` | — |
| `calorieTarget` | integer | Yes | — | — |
| `proteinTarget` | integer | Yes | — | — |
| `fatTarget` | integer | Yes | — | — |
| `carbTarget` | integer | Yes | — | — |
| `tdeeSmoothingFactor` | decimal(4,3) | Yes | `'0.100'` | — |
| `createdAt` | timestamp | No | `now()` | — |
| `updatedAt` | timestamp | No | `now()` | — |

**Notes:**
- Single-user design — only one row expected
- `currentWeight` updated automatically when weight is logged
- `tdeeSmoothingFactor` controls EMA responsiveness (0.01–1.0)
- `activityLevel` is a multiplier (1.2 sedentary → 2.5 very active)

---

### 3.2 `foods`

User's food database with nutritional information.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `userId` | UUID | No | — | FK → users.id (CASCADE) |
| `name` | varchar(255) | No | — | — |
| `emoji` | varchar(10) | Yes | — | — |
| `category` | foodCategory enum | Yes | `'other'` | — |
| `servingLabel` | varchar(100) | Yes | — | — |
| `servingGrams` | decimal(7,1) | Yes | — | — |
| `calories` | decimal(7,1) | Yes | — | — |
| `protein` | decimal(7,1) | Yes | — | — |
| `fat` | decimal(7,1) | Yes | — | — |
| `carbs` | decimal(7,1) | Yes | — | — |
| `source` | foodSource enum | Yes | `'manual'` | — |
| `createdAt` | timestamp | No | `now()` | — |
| `updatedAt` | timestamp | No | `now()` | — |

**Indexes:**
| Name | Columns | Type |
|------|---------|------|
| `foods_user_id_idx` | userId | Standard |

**Notes:**
- `source` tracks origin: manually created, imported from MacroFactor favorites, or from MacroFactor history
- Foods from history imports may lack macro values (displayed as "Needs macros" in UI)
- `servingLabel` is display text like "per 100g", "per slice", etc.
- Deleting a food cascades to delete its `foodLog` entries

---

### 3.3 `foodLog`

Daily food entries linking foods to dates and times.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `userId` | UUID | No | — | FK → users.id (CASCADE) |
| `foodId` | UUID | No | — | FK → foods.id (CASCADE) |
| `date` | date | No | — | — |
| `timeHour` | integer | No | — | 0–23 |
| `servings` | decimal(5,2) | Yes | `'1'` | — |
| `createdAt` | timestamp | No | `now()` | — |
| `updatedAt` | timestamp | No | `now()` | — |

**Indexes:**
| Name | Columns | Type |
|------|---------|------|
| `food_log_user_id_idx` | userId | Standard |
| `food_log_food_id_idx` | foodId | Standard |
| `food_log_user_date_idx` | userId, date | Composite |

**Notes:**
- `timeHour` represents the hour of day (0 = midnight, 12 = noon, etc.)
- `servings` is a multiplier applied to the food's nutritional values
- Composite index on (userId, date) optimizes the common "get all entries for a day" query
- Log entries are sorted by timeHour, then createdAt for display

---

### 3.4 `dailyIntake`

Aggregated daily macro totals. Can be populated from imports or computed from foodLog.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `userId` | UUID | No | — | FK → users.id (CASCADE) |
| `date` | date | No | — | — |
| `calories` | decimal(7,1) | Yes | — | — |
| `protein` | decimal(7,1) | Yes | — | — |
| `fat` | decimal(7,1) | Yes | — | — |
| `carbs` | decimal(7,1) | Yes | — | — |
| `source` | intakeSource enum | Yes | `'logged'` | — |
| `createdAt` | timestamp | No | `now()` | — |

**Indexes:**
| Name | Columns | Type |
|------|---------|------|
| `daily_intake_user_id_idx` | userId | Standard |
| `daily_intake_user_date_idx` | userId, date | Unique |

**Notes:**
- Unique constraint on (userId, date) prevents duplicate entries
- `source: 'imported'` entries come from MacroFactor imports
- `source: 'logged'` entries are computed from foodLog aggregation
- Analytics queries prefer this table for performance; fall back to foodLog aggregation if empty

---

### 3.5 `weightLog`

Daily weight entries.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `userId` | UUID | No | — | FK → users.id (CASCADE) |
| `date` | date | No | — | — |
| `weight` | decimal(5,1) | No | — | — |
| `createdAt` | timestamp | No | `now()` | — |

**Indexes:**
| Name | Columns | Type |
|------|---------|------|
| `weight_log_user_id_idx` | userId | Standard |
| `weight_log_user_date_idx` | userId, date | Unique |

**Notes:**
- Unique constraint on (userId, date) — one weight per day
- Weight is stored in pounds (lbs)
- Logging weight triggers TDEE recalculation in the background
- Also updates `users.currentWeight`

---

### 3.6 `tdeeHistory`

TDEE (Total Daily Energy Expenditure) estimates over time.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `userId` | UUID | No | — | FK → users.id (CASCADE) |
| `date` | date | No | — | — |
| `tdeeEstimate` | decimal(7,1) | Yes | — | — |
| `caloriesConsumed` | decimal(7,1) | Yes | — | — |
| `weightUsed` | decimal(5,1) | Yes | — | — |
| `createdAt` | timestamp | No | `now()` | — |

**Indexes:**
| Name | Columns | Type |
|------|---------|------|
| `tdee_history_user_id_idx` | userId | Standard |
| `tdee_history_user_date_idx` | userId, date | Unique |

**Notes:**
- Populated by the TDEE calculation engine after weight logging
- Also populated during MacroFactor import from the Expenditure sheet
- `tdeeEstimate` is the EMA-smoothed value
- `caloriesConsumed` and `weightUsed` are the inputs that produced the estimate
- Recalculated for the last 90 days whenever a new weight is logged

---

## 4. Foreign Key Relationships

| Source Table | Source Column | Target Table | Target Column | On Delete |
|-------------|--------------|-------------|--------------|-----------|
| foods | userId | users | id | CASCADE |
| foodLog | userId | users | id | CASCADE |
| foodLog | foodId | foods | id | CASCADE |
| dailyIntake | userId | users | id | CASCADE |
| weightLog | userId | users | id | CASCADE |
| tdeeHistory | userId | users | id | CASCADE |

All foreign keys use CASCADE delete — removing the user removes all associated data.

---

## 5. Index Summary

Total: 12 indexes (7 standard + 4 unique + 1 composite)

| Table | Index Count | Hot Query Pattern |
|-------|------------|-------------------|
| foods | 1 | Filter by userId |
| foodLog | 3 | Filter by userId, date, foodId |
| dailyIntake | 2 | Lookup by userId + date |
| weightLog | 2 | Lookup by userId + date |
| tdeeHistory | 2 | Lookup by userId + date |

---

## 6. Seed Data

**File:** `server/src/db/seed.ts`

### Default User
| Field | Value |
|-------|-------|
| age | 30 |
| sex | male |
| heightInches | 70 |
| currentWeight | 180 |
| objective | maintain |
| activityLevel | 1.25 |
| calorieTarget | 2200 |
| proteinTarget | 180 |
| fatTarget | 70 |
| carbTarget | 240 |

### Default Foods (22 items)

| Category | Foods |
|----------|-------|
| Proteins | Chicken Breast, Eggs, Ground Beef (93/7), Salmon, Greek Yogurt |
| Grains | White Rice, Whole Wheat Bread, Oatmeal, Pasta |
| Vegetables | Mixed Salad, Broccoli, Sweet Potato |
| Fruits | Apple, Banana |
| Snacks | Almonds, Protein Bar |
| Dairy | Milk (Whole), Cheddar Cheese |
| Drinks | Black Coffee, Orange Juice |
| Other | Olive Oil, Honey |

Each food includes emoji, serving label, serving grams, and complete macro breakdown. The seed script is idempotent (safe to re-run).

---

## 7. Schema Management

### Push Schema (Development)
```bash
cd server
npm run db:push
```
Pushes the Drizzle schema directly to the database without generating migration files. Used for rapid development.

### Generate Migrations
```bash
npm run db:generate
```
Creates SQL migration files in `server/drizzle/`.

### Run Migrations
```bash
npm run db:migrate
```
Applies pending migration files.

### Seed Data
```bash
npm run db:seed
```
Inserts default user and foods. Skips if data already exists.

### Connection Configuration
```
DATABASE_URL=postgresql://user:password@host:5432/food_tracker
```
Set via environment variable. In Docker, uses the `db` service hostname.
