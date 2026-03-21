# Performance Fix Plan

## Problem
Every page takes several seconds to load despite minimal data. Root causes: missing DB indexes, redundant per-request queries, N+1 patterns, and excessive API calls per page.

---

## Fix 1: Add Database Indexes

**File:** `server/src/db/schema.ts`

The unique composite indexes on `(userId, date)` exist for `dailyIntake`, `weightLog`, and `tdeeHistory`, but there are **no indexes** on foreign key columns used in JOINs and WHERE clauses.

**Add these indexes:**

| Table | Column(s) | Rationale |
|-------|-----------|-----------|
| `foodLog` | `userId` | Every log query filters by userId |
| `foodLog` | `foodId` | Inner join to foods table on every log fetch |
| `foodLog` | `(userId, date)` | Dashboard + analytics filter by user + date range |
| `foods` | `userId` | All food queries filter by userId |
| `dailyIntake` | `userId` | Analytics queries filter by userId (composite unique exists but a plain userId index helps non-date queries) |
| `weightLog` | `userId` | Weight trend queries filter by userId |
| `tdeeHistory` | `userId` | TDEE queries filter by userId |

**Implementation:** Add `index()` calls in the Drizzle schema, then run `drizzle-kit push`.

---

## Fix 2: Cache User ID in Middleware

**Problem:** Every route file has a `getUserId()` function that runs `SELECT id FROM users LIMIT 1` on every single request. On the Analytics page this fires 6 times for the same result.

**Files:**
- `server/src/routes/analytics.ts` — `getUser()` (line 11)
- `server/src/routes/weight.ts` — `getUserId()` (line 11)
- `server/src/routes/foods.ts` — `getUserId()` (line 11)
- `server/src/routes/foodLog.ts` — `getUserId()` (line 11)
- `server/src/routes/user.ts` — direct query (line 13)

**Fix:** Create a middleware that fetches the user once per request and attaches it to `req`. Use a simple in-memory cache with a short TTL (e.g., 30 seconds) since this is a single-user app.

```
// server/src/middleware/userMiddleware.ts
// - Query user on first request, cache result
// - Attach to req.userId (and optionally req.user for full profile)
// - All route handlers read from req instead of querying
```

**Changes per route file:** Replace `getUserId()` / `getUser()` calls with `req.userId` / `req.user`.

---

## Fix 3: Consolidate Analytics into a Single Endpoint

**Problem:** The Analytics page renders 5 cards, each making its own API call:

| Card Component | Endpoint | What It Queries |
|---------------|----------|-----------------|
| TdeeCard | `/analytics/tdee?days=14` | tdeeHistory or weightLog+dailyIntake |
| WeightTrendCard | `/analytics/weight-trend?days=14` | weightLog |
| AvgIntakeCard | `/analytics/daily-intake?days=7` + `/user` | dailyIntake or foodLog+foods, users |
| ActualVsGoalCard | `/analytics/actual-vs-goal?days=7` | dailyIntake or foodLog+foods, users |
| TdeeBreakdownCard | `/analytics/bmr` | users |

That's **6 API calls** hitting largely the same tables.

**Fix:** Add a new consolidated endpoint:

```
GET /api/analytics/summary?days=14
```

Returns a single response:
```json
{
  "tdee": [...],
  "weightTrend": [...],
  "dailyIntake": [...],
  "bmr": { "bmr": 1800, "activityLevel": "moderate", ... },
  "goals": { "calorieTarget": 2000, "proteinTarget": 150, ... }
}
```

**Backend changes (`server/src/routes/analytics.ts`):**
- Add new `/summary` route that fetches user once, runs queries in parallel with `Promise.all`, and returns combined result
- Keep individual endpoints for backward compat but mark as deprecated

**Frontend changes:**
- `client/src/views/AnalyticsView.tsx` — call `useApi('/analytics/summary?days=14')` once, pass data as props to each card
- Update each card component (TdeeCard, WeightTrendCard, etc.) to accept data via props instead of fetching internally

---

## Fix 4: Deduplicate Daily Intake Aggregation

**Problem:** `/analytics/daily-intake` and `/analytics/actual-vs-goal` both run the same `foodLog → foods` JOIN and group-by-date aggregation independently.

**File:** `server/src/routes/analytics.ts`

**Fix:** Extract a shared helper:

```typescript
async function getDailyIntakeData(userId: string, fromDate: string) {
  // 1. Check dailyIntake table first (pre-computed from imports)
  // 2. Fall back to foodLog aggregation
  // Return: Array<{ date, calories, protein, fat, carbs }>
}
```

Both `/daily-intake` and `/actual-vs-goal` call this helper. The consolidated `/summary` endpoint calls it once and reuses the result for both sections.

---

## Fix 5: Batch TDEE History Upsert

**Problem:** `recalculateTdee()` in `server/src/routes/weight.ts` (lines 132-157) loops through each result and runs 2-3 queries per iteration:

```
for each result:
  SELECT from tdeeHistory WHERE userId AND date  → check exists
  if exists: UPDATE tdeeHistory ...
  else: INSERT INTO tdeeHistory ...
```

With 30 data points, that's **60-90 queries**.

**Fix:** Replace the loop with a single batch upsert using Drizzle's `onConflictDoUpdate`:

```typescript
await db.insert(tdeeHistory)
  .values(results.map(r => ({
    userId,
    date: r.date,
    tdeeEstimate: r.tdee.toString(),
    caloriesConsumed: r.calories.toString(),
    weightUsed: r.weight.toString(),
  })))
  .onConflictDoUpdate({
    target: [tdeeHistory.userId, tdeeHistory.date],
    set: {
      tdeeEstimate: sql`excluded.tdee_estimate`,
      caloriesConsumed: sql`excluded.calories_consumed`,
      weightUsed: sql`excluded.weight_used`,
    },
  });
```

**Result:** 60-90 queries → 1 query.

---

## Fix 6: Consolidate Dashboard API Calls (Optional)

**Problem:** `DashboardView.tsx` makes 5 parallel `useApi` calls (lines 66-70):

```typescript
useApi(`/log?date=${dateStr}`)
useApi('/user')
useApi('/analytics/tdee?days=7')
useApi('/analytics/daily-intake?days=7')
useApi(`/weight?from=${dateStr}&to=${dateStr}`)
```

**Fix (lower priority):** Similar to analytics — add a `/api/dashboard?date=YYYY-MM-DD` endpoint that returns all needed data in one response. This is less critical than the analytics fix because these calls are already parallel and hit different tables, but it still eliminates 4 extra round trips and 4 extra `getUserId()` calls.

---

## Implementation Order

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| 1 | Fix 1: Database indexes | Small | High — every query gets faster |
| 2 | Fix 2: Cache user ID middleware | Small | Medium — eliminates 5-6 queries/page |
| 3 | Fix 5: Batch TDEE upsert | Small | High — 60-90 queries → 1 |
| 4 | Fix 3: Consolidated analytics endpoint | Medium | High — 6 API calls → 1 |
| 5 | Fix 4: Deduplicate intake aggregation | Small | Medium — used by Fix 3 |
| 6 | Fix 6: Consolidated dashboard endpoint | Medium | Low-Medium — already parallel |

Fixes 1-3 are quick wins. Fix 3+4 together form the biggest architectural change. Fix 6 is optional polish.
