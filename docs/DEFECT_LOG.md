# Defect Log & Change History — Fuel Food Tracker

This document tracks bugs found, fixes applied, and the complete change history of the project.

---

## 1. Defect Fixes

### DEF-001: Add Food Modal Cutoff on Mobile

**Severity:** Medium
**Commit:** `fb470fc`
**Component:** `AddFoodModal` / `BottomNav`

**Problem:** On mobile devices, the Add Food modal content was cut off at the bottom because the bottom navigation bar overlapped the modal's lower portion. Users could not see or interact with the confirm button.

**Screenshot:** `docs/defect_screenshots/Fuel — Food Tracker_Defect_Food_Entry.png`

**Root Cause:** The modal was rendered within the main content area, and the bottom nav's fixed positioning created an overlap. The modal did not account for `--bottomnav-height` (72px) in its layout.

**Fix:** Clear the bottom navigation when the modal is open, allowing the modal to use the full viewport height.

---

### DEF-002: Docker Health Check Failure

**Severity:** High
**Commit:** `6c2ed28`

**Problem:** Docker health check for the PostgreSQL container was failing, preventing dependent services (migrate, seed, api) from starting.

**Root Cause:** The `pg_isready` command in `docker-compose.yml` was not configured with the correct user/database parameters.

**Fix:** Updated healthcheck to use proper credentials. Also documented the requirement for percent-encoding special characters in `DATABASE_URL` passwords (e.g., `#` → `%23`).

---

### DEF-003: Docker Trust Proxy + Auto-Seed

**Severity:** Medium
**Commit:** `dddf203`

**Problem:** Two issues in Docker deployment:
1. Express was not trusting the Nginx reverse proxy, causing incorrect client IP detection for rate limiting
2. Database was not automatically seeded on first deployment

**Root Cause:**
1. Missing `app.set('trust proxy', 1)` when `NODE_ENV=production`
2. Seed step not included in docker-compose startup sequence

**Fix:**
1. Added conditional trust proxy setting in `server/src/index.ts`
2. Added `seed` service to `docker-compose.yml` that runs after migration

---

### DEF-004: Mass Assignment Vulnerability

**Severity:** Medium (Security)
**Commit:** `f5596b8` (Security Phase 1)

**Problem:** User update endpoint spread `req.body` directly into the database update, allowing clients to set arbitrary fields (e.g., `id`, `createdAt`).

**Root Cause:** No input validation or field allowlisting.

**Fix:** Added Zod schemas with explicit field definitions. Unknown fields are stripped during validation.

---

### DEF-005: ILIKE SQL Injection

**Severity:** Medium (Security)
**Commit:** `f5596b8` (Security Phase 1)

**Problem:** Food search endpoint passed user input directly to PostgreSQL ILIKE without escaping special characters (`%`, `_`, `\`).

**Root Cause:** No sanitization of SQL pattern characters.

**Fix:** Added escaping function for ILIKE special characters before building queries.

---

### DEF-006: Timezone Inconsistency

**Severity:** Low
**Commit:** `f5596b8` (Security Phase 1)

**Problem:** Date handling was inconsistent between client and server, potentially causing food log entries to appear on the wrong day.

**Root Cause:** Mixed use of local dates and UTC dates.

**Fix:** Standardized on UTC-normalized ISO date strings (`YYYY-MM-DD`) at the API boundary.

---

### DEF-007: Vulnerable xlsx Library

**Severity:** High (Security)
**Commit:** `ce416c7` (Security Phase 3)

**Problem:** The `xlsx` library (SheetJS) had known prototype pollution and ReDoS vulnerabilities.

**Root Cause:** Using an unmaintained version of the library.

**Fix:** Replaced `xlsx` with `exceljs`, which is actively maintained and does not have these vulnerabilities. Updated the MacroFactor import service to use ExcelJS APIs.

---

### DEF-008: Import Partial Failure

**Severity:** Medium (Security)
**Commit:** `ce416c7` (Security Phase 3)

**Problem:** MacroFactor import could partially succeed, leaving the database in an inconsistent state if an error occurred mid-import.

**Root Cause:** Individual INSERT statements without transaction wrapping.

**Fix:** Wrapped entire import operation in a database transaction. On any failure, all changes are rolled back.

---

## 2. Performance Defects

### PERF-001: Excessive Database Queries

**Severity:** Medium
**Commit:** `2526634`

**Problem:** Every API request queried the database for the user record, resulting in 100+ unnecessary queries per minute.

**Fix:** Added 30-second in-memory user cache in `userMiddleware.ts`.

---

### PERF-002: Dashboard N+1 Requests

**Severity:** Medium
**Commit:** `2526634`

**Problem:** Dashboard view made 4–5 sequential API calls (user, log, weight, TDEE, intake).

**Fix:** Created consolidated `/api/dashboard` endpoint that fetches all data in parallel.

---

### PERF-003: Analytics Sequential Queries

**Severity:** Medium
**Commit:** `2526634`

**Problem:** Analytics view made 6–8 sequential API calls.

**Fix:** Created consolidated `/api/analytics/summary` endpoint with `Promise.all` parallel execution.

---

### PERF-004: TDEE Batch Insert

**Severity:** Medium
**Commit:** `2526634`

**Problem:** TDEE recalculation performed 60–90 individual INSERT/UPDATE queries in a loop.

**Fix:** Replaced with single batch `INSERT...ON CONFLICT DO UPDATE` query (~8 queries total).

---

### PERF-005: Missing Database Indexes

**Severity:** Medium
**Commit:** `2526634`

**Problem:** Common queries (by userId, by date, composite userId+date) performed full table scans.

**Fix:** Added 12 indexes including composite indexes on hot query paths.

---

## 3. Complete Change History

### Phase 1: Scaffolding & Design System
**Commit:** `fabc4b3`
- Vite + React + TypeScript project initialization
- CSS custom properties design system
- Theme context (dark/light with localStorage)
- App layout shell (sidebar + bottom nav)
- Google Fonts integration (Sora, Outfit)

### Phase 2: Backend & Database
**Commit:** `55fbaf2`
- Express.js server with TypeScript
- PostgreSQL database with Drizzle ORM
- 6 tables, 5 enums
- RESTful API endpoints
- Seed data (user + 22 foods)
- Error handling middleware

### Phase 3: Dashboard View
**Commit:** `1e237be`
- CalorieRing (animated SVG donut)
- MacroCard (protein/fat/carbs progress bars)
- DayNavigator and WeekStrip
- TdeeIntakeChart (SVG area chart)
- Weight logging modal

### Phase 4: Food Log View
**Commit:** `54149d1`
- Timeline component (hourly grouping)
- FoodEntry with swipe-to-delete
- AddFoodModal (search → select → confirm)
- LogSummary badges
- FAB for quick add

### Phase 5: My Foods Database
**Commit:** `9115ebe`
- Food CRUD with emoji picker
- SearchBar and CategoryTabs
- FoodDbList with macro columns
- FoodForm modal (create/edit)

### Phase 6: Analytics View
**Commit:** `d8be3a1`
- TdeeCard with sparkline
- WeightTrendCard with change indicator
- AvgIntakeCard bar chart
- ActualVsGoalCard comparison
- TdeeBreakdownCard (BMR grid)
- PeriodSelector (7/14/30 days)

### Phase 7: Settings & Import
**Commit:** `ab72155`
- Settings groups (profile, goals, macros, TDEE)
- MacroFactor .xlsx import
- Theme selector
- Auto-save on blur/change

### Phase 8: Weight & TDEE Integration
**Commit:** `755891f`
- Weight upsert logic
- Background TDEE recalculation
- Mifflin-St Jeor BMR
- EMA weight smoothing

### Phase 9: Polish & PWA
**Commit:** `424b3ba`
- PWA manifest and service worker
- Loading skeletons
- Error boundaries
- Toast notifications
- Empty state components

### Phase 10: Test Suite
**Commit:** `e39d892`
- 334 tests (274 client, 60 server)
- React Testing Library for components
- Vitest for unit/integration tests

### Security Phases 1–5
**Commits:** `f5596b8` → `ef56862` (merged in `29da00e`)
- Zod input validation
- Helmet security headers
- Rate limiting
- ExcelJS migration
- Transaction wrapping
- Request logging
- CSP headers

### Performance Fixes
**Commit:** `2526634`
- User cache (30s TTL)
- Consolidated endpoints (dashboard, analytics)
- Batch TDEE upsert
- Database indexes
- Shared intake helper

### Docker Deployment
**Commits:** `ac0c5e6`, `6c2ed28`, `dddf203`
- Multi-stage Dockerfile (6 stages)
- docker-compose.yml (5 services)
- Nginx reverse proxy
- Auto-migrate and seed
- Trust proxy fix
- Healthcheck fix
