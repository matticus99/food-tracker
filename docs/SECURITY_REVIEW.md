# Security Review Report

**Date:** 2026-03-02
**Scope:** Full codebase (client + server)
**Test Suite:** 334 tests, all passing (274 client, 60 server)

---

## Executive Summary

The Food Tracker is a single-user localhost PWA. The codebase has **no critical runtime vulnerabilities** in its current deployment context, but contains several patterns that would become dangerous if the app were ever network-exposed. The most significant finding is a **complete absence of server-side integration tests** — all 60 server tests cover only pure functions, leaving every HTTP route, DB interaction, and input validation path untested.

### Findings by Severity (Context-Adjusted for Localhost Single-User PWA)

| Severity | Count | Key Issues |
|----------|-------|------------|
| High     | 1     | Vulnerable `xlsx` dependency (prototype pollution + ReDoS) |
| Medium   | 8     | Mass assignment, no input validation, import DoS, timezone bugs, no transactions, TDEE integrity |
| Low      | 7     | Missing security headers, no rate limiting, negative servings allowed, stale TDEE on PUT |
| Info     | 5     | No auth (by design), CORS fine, no XSS vectors found, no env leaks |

### Testing Gaps

| Category | Tests | Coverage |
|----------|-------|----------|
| Server routes (integration) | 0 | **NONE** |
| Import service | 0 | **NONE** |
| Background TDEE recalculation | 0 | **NONE** |
| Input validation edge cases | 0 | **NONE** |
| TDEE service (existing) | 49 | Good (math), missing boundary cases |
| Error handler (existing) | 11 | Good |
| Client components (existing) | 274 | Good |

---

## Detailed Findings

### HIGH: H1 — Vulnerable `xlsx` Dependency

**Location:** `server/package.json` — `xlsx: ^0.18.5`
**Issue:** Known prototype pollution (GHSA-4r6h-8v6p-xvw6) and ReDoS (GHSA-5pgg-2g8v-p4x9). No fix available from npm. The import endpoint accepts user-uploaded `.xlsx` files and passes buffers directly to `XLSX.read()`.
**Why HIGH:** Even in single-user context, the user may import files downloaded from the internet.

---

### MEDIUM: M1 — Mass Assignment (4 endpoints)

**Locations:**
- `server/src/routes/user.ts:28` — `PUT /api/user`
- `server/src/routes/foods.ts:49` — `POST /api/foods`
- `server/src/routes/foods.ts:64` — `PUT /api/foods/:id`
- `server/src/routes/foodLog.ts:82` — `PUT /api/log/:id`

**Issue:** All spread `req.body` directly into Drizzle `.set()` or `.values()` without field whitelisting. Any schema column (including `id`, `userId`, `createdAt`) can be overwritten.

---

### MEDIUM: M2 — No Server-Side Input Validation

**Locations:**
- `server/src/routes/weight.ts:42-43` — date/weight not validated
- `server/src/routes/foodLog.ts:59-67` — timeHour/servings not validated
- `server/src/routes/analytics.ts:26` — `days` param unbounded (accepts negative, huge values)
- `server/src/routes/foods.ts:24` — `category` enum not validated

**Issue:** Server accepts any value from request bodies and query params. Client-side validation is trivially bypassed.

---

### MEDIUM: M3 — Import Endpoint DoS / No Transactions

**Location:** `server/src/services/macrofactorImport.ts`
**Issue:** No row limit, no transaction boundary, sequential individual INSERT queries. A large xlsx (100k rows) would execute ~200k queries sequentially, blocking the event loop. A crash midway leaves partial data with no rollback.

---

### MEDIUM: M4 — Timezone-Dependent Date Calculations

**Locations:**
- `server/src/services/macrofactorImport.ts:18-23` — `excelDateToISO()` mixes local time with UTC output
- `server/src/routes/analytics.ts:16-20` — `daysAgo()` same issue

**Issue:** `new Date()` in local TZ → `.toISOString()` in UTC can shift dates by ±1 day depending on server timezone and time of day. Silently corrupts imported dates and analytics date ranges.

---

### MEDIUM: M5 — TDEE Recalculation Integrity

**Location:** `server/src/routes/weight.ts:70-168`
**Issue:** `recalculateTdee()` runs in background with `catch(() => {})`, queries entire history with no date filter, has no transaction, and updates `user.currentWeight`. Partial failure leaves TDEE history inconsistent with no error signal to the user.

---

### MEDIUM: M6 — File Upload Weak Validation

**Location:** `server/src/routes/import.ts:27`
**Issue:** Only checks `originalname.endsWith('.xlsx')` — client-controlled value. No MIME type or magic byte verification. Mitigated by `XLSX.read()` parser rejecting non-xlsx content, but combined with H1, this widens the attack surface.

---

### MEDIUM: M7 — ILIKE Wildcard Not Escaped

**Location:** `server/src/routes/foods.ts:28`
**Issue:** Search input passed directly into `ilike(foods.name, \`%${search}%\`)` without escaping `%` and `_`. Not SQL injection (Drizzle parameterizes), but allows wildcard-based enumeration. Minor in single-user context.

---

### MEDIUM: M8 — No Pagination on Food Listing

**Location:** `server/src/routes/foods.ts:30-35`
**Issue:** No LIMIT clause on food queries. After large imports, could return thousands of records, causing client-side performance degradation.

---

### LOW: L1 — No HTTP Security Headers

**Location:** `server/src/index.ts`
**Issue:** No `helmet` middleware. Missing X-Frame-Options, X-Content-Type-Options, etc.

### LOW: L2 — No Rate Limiting

**Location:** `server/src/index.ts`
**Issue:** No rate limiting on any endpoint. Import endpoint is the primary concern.

### LOW: L3 — Negative/Zero Values Accepted

**Locations:** `server/src/routes/foodLog.ts:67` (servings), `server/src/routes/weight.ts` (weight)
**Issue:** No minimum value constraints. Negative servings produce negative calorie totals.

### LOW: L4 — Weight PUT Doesn't Trigger TDEE Recalculation

**Location:** `server/src/routes/weight.ts:171-185`
**Issue:** POST triggers `recalculateTdee()`, but PUT does not. Editing a weight leaves TDEE stale.

### LOW: L5 — Race Condition in Weight Upsert

**Location:** `server/src/routes/weight.ts:49-67`
**Issue:** TOCTOU race — concurrent POSTs for same date could both attempt INSERT. Unique index catches it but returns 500 instead of 409.

### LOW: L6 — Background TDEE Errors Swallowed

**Location:** `server/src/routes/weight.ts:70`
**Issue:** `.catch(() => {})` silently discards all errors from TDEE recalculation.

### LOW: L7 — .env.example Contains Working Credentials

**Location:** `server/.env.example`
**Issue:** Contains `postgres:postgres` which may match actual dev database credentials.

---

### False Positives / Non-Issues

| Original Finding | Verdict |
|-----------------|---------|
| No authentication | By design (single-user localhost PWA) |
| No CSRF protection | Not applicable without auth |
| Error handler leaks internals | False positive — handler correctly returns generic message |
| CORS too permissive | Non-issue — correctly configured for localhost:5173 |
| PWA autoUpdate risky | Non-issue for localhost |
| serialize-javascript RCE | Build-time only, INFO severity |
| No XSS vectors | Confirmed — zero dangerouslySetInnerHTML, no innerHTML, no eval |
| No open redirects | Confirmed — all routes statically defined |
| No env vars exposed client-side | Confirmed — zero import.meta.env usage |

---

## Remediation Plan

### Phase 1: Quick Wins (Low Effort, High Impact)

#### 1.1 Fix Mass Assignment (All 4 endpoints)
**Effort:** ~30 min | **Impact:** Eliminates M1

Whitelist allowed fields in each route handler instead of spreading `req.body`:

```typescript
// user.ts PUT
const { age, sex, heightInches, currentWeight, objective, activityLevel,
        calorieTarget, proteinTarget, fatTarget, carbTarget, tdeeSmoothingFactor } = req.body;
.set({ age, sex, heightInches, currentWeight, objective, activityLevel,
       calorieTarget, proteinTarget, fatTarget, carbTarget, tdeeSmoothingFactor,
       updatedAt: new Date() })

// foods.ts POST
const { name, emoji, category, servingLabel, servingGrams, calories, protein, fat, carbs } = req.body;
.values({ name, emoji, category, servingLabel, servingGrams, calories, protein, fat, carbs, userId })

// foods.ts PUT
.set({ name, emoji, category, servingLabel, servingGrams, calories, protein, fat, carbs,
       updatedAt: new Date() })

// foodLog.ts PUT
const { servings, timeHour, date } = req.body;
.set({ servings, timeHour, date, updatedAt: new Date() })
```

#### 1.2 Escape ILIKE Wildcards
**Effort:** 5 min | **Impact:** Eliminates M7

```typescript
function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}
// In foods.ts
conditions.push(ilike(foods.name, `%${escapeLike(search)}%`));
```

#### 1.3 Add Helmet for Security Headers
**Effort:** 5 min | **Impact:** Eliminates L1

```bash
cd server && npm install helmet
```
```typescript
import helmet from 'helmet';
app.use(helmet());
```

#### 1.4 Fix Timezone Bugs
**Effort:** 15 min | **Impact:** Eliminates M4

```typescript
// macrofactorImport.ts — use UTC-only arithmetic
function excelDateToISO(serial: number): string {
  const msPerDay = 86400000;
  const excelEpochMs = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpochMs + serial * msPerDay);
  return date.toISOString().split('T')[0]!;
}

// analytics.ts — use UTC-only date math
function daysAgo(days: number): string {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() - days);
  return utc.toISOString().split('T')[0]!;
}
```

#### 1.5 Log TDEE Errors Instead of Swallowing
**Effort:** 2 min | **Impact:** Eliminates L6

```typescript
recalculateTdee(userId).catch((err) => {
  console.error('[TDEE Recalc Error]', err.message);
});
```

#### 1.6 Trigger TDEE Recalc on Weight PUT
**Effort:** 5 min | **Impact:** Eliminates L4

Add `recalculateTdee(userId).catch(...)` after the weight PUT update, same as POST.

---

### Phase 2: Input Validation (Medium Effort)

#### 2.1 Add Zod Validation Schemas
**Effort:** ~1-2 hours | **Impact:** Eliminates M2, L3

```bash
cd server && npm install zod
```

Create `server/src/validation/schemas.ts`:
```typescript
import { z } from 'zod';

export const weightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.coerce.number().positive().max(1500),
});

export const foodLogCreateSchema = z.object({
  foodId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeHour: z.coerce.number().int().min(0).max(23),
  servings: z.coerce.number().positive().max(100).default(1),
});

export const foodLogUpdateSchema = z.object({
  servings: z.coerce.number().positive().max(100).optional(),
  timeHour: z.coerce.number().int().min(0).max(23).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const foodCreateSchema = z.object({
  name: z.string().min(1).max(255),
  emoji: z.string().max(10).optional(),
  category: z.enum(['protein', 'grain', 'fruit', 'vegetable', 'dairy',
                     'fat', 'sweet', 'beverage', 'other']).default('other'),
  servingLabel: z.string().max(100).optional(),
  servingGrams: z.coerce.number().positive().optional(),
  calories: z.coerce.number().min(0).max(50000),
  protein: z.coerce.number().min(0).max(5000),
  fat: z.coerce.number().min(0).max(5000),
  carbs: z.coerce.number().min(0).max(5000),
});

export const daysQuerySchema = z.coerce.number().int().positive().max(365).default(14);
```

Apply validation in each route handler using `schema.parse(req.body)`.

#### 2.2 Add File Upload Validation
**Effort:** 15 min | **Impact:** Strengthens M6

```typescript
// import.ts — add multer fileFilter + magic byte check
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.endsWith('.xlsx')) {
      cb(new AppError(400, 'Only .xlsx files are supported') as any);
      return;
    }
    cb(null, true);
  },
});

// After multer, validate magic bytes
if (req.file.buffer[0] !== 0x50 || req.file.buffer[1] !== 0x4B) {
  throw new AppError(400, 'Invalid file format');
}
```

#### 2.3 Add Pagination to Food Listing
**Effort:** 20 min | **Impact:** Eliminates M8

```typescript
// foods.ts — add limit/offset
const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
const offset = parseInt(req.query.offset as string) || 0;

const result = await db.select().from(foods)
  .where(and(...conditions))
  .orderBy(foods.name)
  .limit(limit)
  .offset(offset);
```

---

### Phase 3: Dependency & Import Hardening (Medium Effort)

#### 3.1 Replace `xlsx` with `exceljs`
**Effort:** ~2-3 hours | **Impact:** Eliminates H1

```bash
cd server && npm uninstall xlsx && npm install exceljs
```

Rewrite `macrofactorImport.ts` to use ExcelJS's streaming API. ExcelJS is actively maintained, has no known vulnerabilities, and supports the same features needed.

#### 3.2 Wrap Import in Transaction + Add Row Limit
**Effort:** ~1 hour | **Impact:** Eliminates M3

```typescript
import { sql } from 'drizzle-orm';

const MAX_ROWS_PER_SHEET = 5000;

// In processSheet or similar:
if (rows.length > MAX_ROWS_PER_SHEET) {
  throw new AppError(400, `Sheet exceeds maximum of ${MAX_ROWS_PER_SHEET} rows`);
}

// Wrap entire import in transaction
await db.transaction(async (tx) => {
  // Use tx instead of db for all operations
  const intakeResult = await processIntakeSheet(tx, workbook, userId);
  const weightResult = await processWeightSheet(tx, workbook, userId);
  // ... etc
});
```

#### 3.3 Add Rate Limiting to Import
**Effort:** 15 min | **Impact:** Eliminates L2 (for import)

```bash
cd server && npm install express-rate-limit
```
```typescript
import rateLimit from 'express-rate-limit';

const importLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
router.post('/macrofactor', importLimiter, upload.single('file'), ...);
```

---

### Phase 4: Server Integration Tests (High Effort, Highest Value)

**Effort:** ~4-6 hours | **Impact:** Addresses the largest gap in the test suite

#### 4.1 Test Infrastructure Setup

```bash
cd server && npm install -D supertest @types/supertest
```

Create test database setup:
```typescript
// server/src/test/setup.ts
// Configure test DB, run migrations, seed, cleanup between tests
```

#### 4.2 Route Tests to Write (Priority Order)

**Priority 1 — Mass Assignment Tests (verifies Phase 1 fix):**
- `PUT /api/user` rejects `id`, `createdAt` overwrite
- `PUT /api/foods/:id` rejects `userId`, `id` overwrite
- `PUT /api/log/:id` rejects `userId`, `id` overwrite

**Priority 2 — Input Validation Tests (verifies Phase 2 fix):**
- Weight route: invalid dates, negative/zero/huge weight, non-numeric
- Food log route: invalid timeHour, negative servings, non-existent foodId
- Analytics route: negative days, huge days, non-numeric days
- Foods route: invalid category enum, missing name

**Priority 3 — Import Tests:**
- Missing file → 400
- Wrong extension → 400
- Invalid file content → graceful error
- Empty xlsx → zero counts
- Duplicate import → skip counts
- Row limit exceeded → 400

**Priority 4 — Error Handling Tests:**
- Non-existent resource → 404
- Malformed UUID → 400 or 500 (currently 500, should be 400)
- DB constraint violation → proper error (not raw SQL error)

#### 4.3 Import Service Unit Tests

```typescript
// server/src/services/macrofactorImport.test.ts
describe('excelDateToISO', () => {
  it('converts known Excel dates correctly', ...);
  it('handles serial date 0', ...);
  it('handles negative serial dates', ...);
  it('is timezone-independent', ...);  // Run with TZ override
});
```

#### 4.4 TDEE Boundary Tests

Add to existing `tdee.test.ts`:
```typescript
describe('boundary conditions', () => {
  it('handles NaN smoothing factor', ...);
  it('handles Infinity in calories', ...);
  it('handles negative age in BMR', ...);
  it('handles zero height in BMR', ...);
});
```

---

### Phase 5: Optional Hardening (Low Priority)

These are nice-to-have for a localhost app:

| Item | Effort | Notes |
|------|--------|-------|
| Add `express-rate-limit` globally | 10 min | 100 req/15 min default |
| Set explicit `express.json({ limit: '16kb' })` | 2 min | Defense in depth |
| Replace `.env.example` credentials | 2 min | Use `user:password` placeholders |
| Add request logging with `morgan` | 5 min | Useful for debugging |
| Self-host Google Fonts | 30 min | Remove external dependency |
| Add CSP meta tag | 15 min | Restrict script sources |

---

## Implementation Priority Matrix

| Phase | Effort | Impact | Findings Resolved |
|-------|--------|--------|-------------------|
| Phase 1: Quick Wins | ~1 hour | High | M1, M4, M7, L1, L4, L6 |
| Phase 2: Validation | ~2-3 hours | High | M2, M6, M8, L3 |
| Phase 3: Dependencies | ~3-4 hours | High | H1, M3, L2 |
| Phase 4: Testing | ~4-6 hours | Critical | All findings become verifiable |
| Phase 5: Optional | ~1 hour | Low | Defense in depth |

**Total estimated effort: ~12-16 hours across all phases**

---

## Positive Findings (What's Done Right)

- **No SQL injection** — Drizzle ORM parameterizes all queries correctly
- **No XSS vectors** — Zero `dangerouslySetInnerHTML`, `innerHTML`, `eval()`
- **No env leaks** — Zero `import.meta.env` in client code
- **No open redirects** — All routes statically defined
- **Good error handler** — Generic "Internal server error" for unhandled exceptions
- **User scoping** — All queries filter by `userId`
- **Memory-only uploads** — No files written to disk
- **`.env` gitignored** — Credentials not in version control
- **Strong client test coverage** — 274 component/hook/context tests

---

## Second Security Review

**Date:** 2026-03-05
**Scope:** Full codebase re-audit from scratch
**Test Suite:** 145 server tests passing (was 137 with 4 failures), 274 client tests (9 pre-existing failures from component refactors)

### Summary

Re-examined the entire codebase with false-positive validation against the app's threat model (single-user, self-hosted, localhost). The first review's remediation is **fully implemented** — all Phase 1-3 fixes are in place. Two robustness gaps and one testing gap were identified and resolved.

### Remediation Status (First Review Findings)

| Finding | Status | Evidence |
|---------|--------|----------|
| H1: Vulnerable `xlsx` | **RESOLVED** | Replaced with `exceljs` |
| M1: Mass assignment | **RESOLVED** | All schemas use `.strict()`, destructured field whitelisting |
| M2: No input validation | **RESOLVED** | Zod schemas on all mutation routes |
| M3: Import DoS | **RESOLVED** | 5,000 row limit, rate limiting, transaction |
| M4: Timezone bugs | **RESOLVED** | `Date.UTC()` used in `daysAgo()` |
| M5: TDEE integrity | **RESOLVED** | Error logging, batch upsert |
| M6: Weak file validation | **RESOLVED** | Extension + magic bytes + ExcelJS parsing |
| M7: ILIKE injection | **RESOLVED** | Special chars escaped: `search.replace(/[%_\\]/g, '\\$&')` |
| M8: No pagination | **RESOLVED** | `limit` (max 200) + `offset` on food queries |
| L1: No security headers | **RESOLVED** | `helmet()` configured |
| L2: No rate limiting | **RESOLVED** | 200/15min API, 5/hr import |
| L3: Negative values | **RESOLVED** | Zod `.positive()` / `.min(0)` constraints |
| L4: Weight PUT no TDEE recalc | **RESOLVED** | `safeRecalculateTdee()` called on PUT |
| L6: Errors swallowed | **RESOLVED** | `console.error('[TDEE Recalc Error]', err.message)` |

### New Findings (This Review)

#### F1: GET endpoint date params not validated (LOW — resolved)
- **Files:** `weight.ts`, `dashboard.ts`, `foodLog.ts`
- **Issue:** GET routes accepted raw date strings without format validation. Invalid dates caused PostgreSQL 500 errors instead of clean 400 responses.
- **Fix:** Added `validateDateParam()` helper in `schemas.ts`, applied to all GET routes.

#### F2: UUID path params not validated (LOW — resolved)
- **Files:** `foods.ts`, `foodLog.ts`, `weight.ts`
- **Issue:** `req.params.id` used directly without UUID format validation. Non-UUID strings caused PostgreSQL type errors → 500.
- **Fix:** Added `validateUuidParam()` helper in `schemas.ts`, applied to all PUT/DELETE routes.

#### F3: Pre-existing test failures (LOW — resolved)
- **File:** `errorHandler.test.ts`
- **Issue:** 4 tests expected `{ error }` but handler returns `{ error, message }`. Tests were out of sync with implementation.
- **Fix:** Updated tests to match current response shape.

### False Positives Validated

The following were raised during audit but validated as non-issues:

| Finding | Verdict | Reasoning |
|---------|---------|-----------|
| No authentication | False positive | Single-user by design; all queries scoped by `userId` |
| Hardcoded .env credentials | False positive | Not in git history; localhost-only; `.gitignore` correct |
| Missing CSRF | False positive | No cookies, JSON API with CORS — CSRF not exploitable |
| Overly permissive CORS | False positive | `localhost:5173` fallback correct for dev |
| File upload validation | False positive | Defense-in-depth: extension + magic bytes + ExcelJS + rate limit |
| Global state race condition | False positive | Node.js single-threaded; single-user; worst case = redundant recalc |
| Missing security headers | False positive | `helmet()` defaults appropriate for JSON API |
| `z.coerce.number()` issues | False positive | Factually wrong — `Number("123abc")` returns NaN, rejected by Zod |

### Test Coverage Update

| Category | Before | After |
|----------|--------|-------|
| Server unit tests | 133 passing, 4 failing | 145 passing, 0 failing |
| Validation helper tests | 0 | 8 (validateDateParam + validateUuidParam) |
| Error handler tests | 7 passing, 4 failing | 11 passing, 0 failing |
