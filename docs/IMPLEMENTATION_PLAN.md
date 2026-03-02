# Food Tracker — Phased Implementation Plan

## Overview

A custom food tracking PWA inspired by MacroFactor, with adaptive TDEE, timeline-based food logging, and a personal food database. Built with React + Vite + TypeScript (frontend) and Express.js + PostgreSQL (backend). Adaptive light/dark themes. Desktop sidebar + mobile bottom nav.

**Wireframe reference:** `docs/wireframes/mockup.html`
**Data source:** MacroFactor export (`MacroFactor-20260226190955.xlsx`) — 228 days of intake data, 243 days of weight/TDEE, 10 favorite foods, 68 food history names

---

## Tech Stack

| Layer      | Technology                            |
|------------|---------------------------------------|
| Frontend   | React 18, Vite, TypeScript            |
| Styling    | CSS Modules + CSS custom properties   |
| State      | React Context + useReducer            |
| Backend    | Express.js, TypeScript                |
| Database   | PostgreSQL                            |
| ORM        | Drizzle ORM                           |
| PWA        | vite-plugin-pwa (Workbox)             |
| Fonts      | Sora (display) + Outfit (body)        |
| Charts     | Lightweight SVG (hand-rolled)         |

---

## Design System (from wireframe)

### Colors
- **Primary:** `#6366F1` (indigo)
- **Protein:** `#06B6D4` (cyan)
- **Fat:** `#F97316` (orange)
- **Carbs:** `#10B981` (emerald)
- **Weight:** `#8B5CF6` (violet)
- **Danger:** `#F43F5E` (rose)

### Themes
- **Dark:** base `#0B0C10`, surface `#13151B`, elevated `#1B1D25`, header `#101218`
- **Light:** base `#F8FAFC`, surface `#FFFFFF`, elevated `#F1F5F9`, header `#F0F2F5`

### Typography
- Display/numbers: Sora (weights 300–800)
- Body/UI: Outfit (weights 300–700)

### Spacing Scale
`4 / 8 / 16 / 24 / 32 / 48 / 64 px`

### Border Radii
`8 / 12 / 16 / 20 / 9999 px`

### Layout
- Desktop: 240px sidebar, content max-width 960px
- Mobile: 72px bottom nav, full-width content
- Breakpoints: 640px (mobile), 1024px (tablet), 1280px (desktop wide)

---

## Phase 1 — Project Scaffolding & Design System

**Goal:** Runnable app shell with routing, theming, and layout.

### Tasks
1. **Initialize project** — `npm create vite@latest` with React + TypeScript template
2. **Install dependencies** — react-router-dom, vite-plugin-pwa
3. **PWA manifest** — app name, icons, theme color, display: standalone
4. **Service worker** — basic precache strategy via Workbox
5. **CSS design system** — port all CSS variables from wireframe into `src/styles/variables.css`
6. **Theme provider** — React context for dark/light toggle, persist to localStorage, `data-theme` attribute on `<html>`
7. **App layout** — sidebar (desktop), bottom nav (mobile), main content area with sticky page headers
8. **Route structure:**
   - `/` → Dashboard
   - `/log` → Food Log
   - `/analytics` → Analytics
   - `/foods` → My Foods
   - `/settings` → Settings
9. **Navigation components** — Sidebar with logo + nav items + theme toggle, BottomNav with 5 tabs
10. **Page shell components** — PageHeader (sticky, grey-toned), empty view containers for each route

### Deliverable
App runs locally, all 5 views reachable via nav, theme toggle works, responsive layout matches wireframe structure. No data yet.

---

## Phase 2 — Backend & Database

**Goal:** API server with PostgreSQL schema, all CRUD endpoints.

### Database Schema

```
users
├── id (uuid, PK)
├── age (int)
├── sex (enum: male/female)
├── height_inches (decimal)
├── current_weight (decimal)
├── objective (enum: cut/maintain/bulk)
├── activity_level (decimal, default 1.25)
├── calorie_target (int)
├── protein_target (int)
├── fat_target (int)
├── carb_target (int)
├── tdee_smoothing_factor (decimal, default 0.1)
├── created_at (timestamp)
└── updated_at (timestamp)

foods
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── name (varchar)
├── emoji (varchar, nullable)
├── category (enum: proteins/grains/vegetables/fruits/dairy/snacks/drinks/other)
├── serving_label (varchar, e.g. "per 100g", "per egg (57g)")
├── serving_grams (decimal, nullable)
├── calories (decimal, nullable)
├── protein (decimal, nullable)
├── fat (decimal, nullable)
├── carbs (decimal, nullable)
├── source (enum: manual/imported_favorite/imported_history, default 'manual')
├── created_at (timestamp)
└── updated_at (timestamp)

food_log
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── food_id (uuid, FK → foods)
├── date (date)
├── time_hour (int, 0–23)
├── servings (decimal, default 1)
├── created_at (timestamp)
└── updated_at (timestamp)

daily_intake
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── date (date, unique per user)
├── calories (decimal)
├── protein (decimal)
├── fat (decimal)
├── carbs (decimal)
├── source (enum: logged/imported, default 'logged')
└── created_at (timestamp)

weight_log
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── date (date, unique per user)
├── weight (decimal)
└── created_at (timestamp)

tdee_history
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── date (date, unique per user)
├── tdee_estimate (decimal)
├── calories_consumed (decimal)
├── weight_used (decimal, nullable)
└── created_at (timestamp)
```

### API Endpoints

```
Auth (simple — single-user for now, token-based):
POST   /api/auth/login

User:
GET    /api/user
PUT    /api/user

Foods:
GET    /api/foods                    (query: ?category=&search=)
POST   /api/foods
PUT    /api/foods/:id
DELETE /api/foods/:id

Food Log:
GET    /api/log?date=YYYY-MM-DD
POST   /api/log
PUT    /api/log/:id
DELETE /api/log/:id

Weight:
GET    /api/weight?from=&to=
POST   /api/weight
PUT    /api/weight/:id

Analytics:
GET    /api/analytics/tdee?days=14
GET    /api/analytics/weight-trend?days=14
GET    /api/analytics/daily-intake?days=7
GET    /api/analytics/actual-vs-goal?days=7

Import:
POST   /api/import/macrofactor       (multipart file upload, .xlsx)
GET    /api/import/status             (check if import has been done)
```

### Tasks
1. **Initialize Express project** — TypeScript, folder structure (`src/routes/`, `src/db/`, `src/middleware/`)
2. **PostgreSQL connection** — Drizzle ORM setup, connection pool
3. **Define schema** — Drizzle schema files for all tables
4. **Migrations** — initial migration to create all tables
5. **Seed data** — populate default foods (chicken, eggs, rice, bread, almonds, apple, coffee, salad, etc.)
6. **CRUD routes** — foods, food_log, weight_log, user settings
7. **Analytics routes** — TDEE calculation (EMA), weight trend, daily intake averages, actual-vs-goal
8. **TDEE engine** — exponential moving average implementation with configurable smoothing factor
9. **Error handling middleware** — consistent error responses
10. **CORS + environment config** — .env for DB connection, allowed origins

### Deliverable
All endpoints testable via curl/Postman. Database seeded with sample foods. TDEE calculation working.

---

## Phase 3 — Dashboard View

**Goal:** Fully functional dashboard matching wireframe.

### Components
1. **DayNavigator** — prev/next arrows, "Today" label, controlled date state
2. **WeekStrip** — 7 day buttons (Mon–Sun), highlight today, dot indicator for days with data
3. **CalorieRing** — SVG donut chart, animated stroke-dashoffset, center shows remaining calories
4. **CalorieStats** — consumed / target values beneath ring (38px gap)
5. **MacroCard** — unified card with 3 rows (protein/fat/carbs), colored dot + label + progress bar + value/target
6. **TdeeIntakeChart** — dual-line SVG chart (orange TDEE, indigo actual), gradient fills, 7-day rolling, legend

### Data Flow
- Selected date from DayNavigator drives all data fetches
- `GET /api/log?date=` → calories + macros consumed
- `GET /api/user` → targets
- `GET /api/analytics/tdee?days=7` → TDEE line data
- `GET /api/analytics/daily-intake?days=7` → intake line data

### Deliverable
Dashboard displays real data for selected date. Ring animates. Macro bars reflect actual intake. TDEE chart plots 7-day history.

---

## Phase 4 — Food Log View

**Goal:** Timeline-based food log for logging meals by hour.

### Components
1. **LogSummary** — top bar showing daily totals (cal, P, F, C) with colored badges
2. **Timeline** — vertical timeline with vertical line, hourly time slots (7 AM – 6 PM default range)
3. **TimeSlot** — time label (indigo when has entries), food entries or "+" add button
4. **FoodEntry** — emoji + name + serving + calories per item
5. **AddFoodModal** — modal/sheet to search food database and add entry with serving size
6. **FAB** — floating action button for quick add

### Data Flow
- `GET /api/log?date=` → group entries by `time_hour`
- `POST /api/log` → add food entry to specific hour
- `DELETE /api/log/:id` → remove entry (swipe or tap to delete)

### Deliverable
Full timeline view. Add foods from database to any time slot. Daily summary updates live. Entries deletable.

---

## Phase 5 — My Foods Database

**Goal:** Personal food library with search, categories, and CRUD.

### Components
1. **SearchBar** — search input with clear (X) button, filters food list
2. **CategoryTabs** — horizontal scroll tabs (All, Proteins, Grains, Vegetables, Fruits, Dairy, Snacks, Drinks)
3. **FoodDbList** — list of food items
4. **FoodDbItem** — emoji + name + serving label + macro columns (Cal, P, F, C). Imported history foods with null macros show a "needs macros" badge
5. **AddFoodForm** — modal/page for creating new food entry (name, emoji, category, serving info, macros)
6. **EditFoodForm** — edit existing food (also used to fill in macros for imported history foods)

### Data Flow
- `GET /api/foods?category=&search=` → filtered list
- `POST /api/foods` → create new food
- `PUT /api/foods/:id` → edit food
- `DELETE /api/foods/:id` → remove food

### Deliverable
Searchable, filterable food library. Create/edit/delete foods. Categories work. Mobile responsive grid.

---

## Phase 6 — Analytics View

**Goal:** 4 chart cards + TDEE breakdown, all with period selectors.

### Components
1. **AnalyticsGrid** — 2-column grid (1-col on mobile)
2. **TdeeCard** — line chart (orange), period selector (7d/14d/30d), current TDEE value
3. **WeightTrendCard** — line chart (violet), period selector, current weight + change indicator
4. **AvgIntakeCard** — bar chart (indigo), target dashed line, average value
5. **ActualVsGoalCard** — line chart (emerald) with dashed goal line, color-coded dots (green=under, orange=over), day labels, legend
6. **TdeeBreakdownCard** — full-width card showing BMR, activity factor, estimated TDEE, daily target

### Data Flow
- `GET /api/analytics/tdee?days=` → TDEE trend data
- `GET /api/analytics/weight-trend?days=` → weight data points
- `GET /api/analytics/daily-intake?days=` → per-day intake bars
- `GET /api/analytics/actual-vs-goal?days=7` → actual vs target per day
- `GET /api/user` → BMR calc inputs, activity factor, targets

### Deliverable
All 4 chart cards render with real data. Period selectors switch timeframes. TDEE breakdown displays correctly.

---

## Phase 7 — Settings View & MacroFactor Import

**Goal:** User profile, TDEE configuration, and data import from MacroFactor.

### Components
1. **SettingsGroup** — grouped card sections
2. **ProfileSettings** — age, sex, height, current weight inputs
3. **GoalSettings** — objective (cut/maintain/bulk), calorie target, macro targets (P/F/C grams)
4. **TdeeSettings** — smoothing factor slider (0.05–0.3), activity level selector, recalculation trigger
5. **AppSettings** — theme toggle (dark/light/system), units (imperial/metric)
6. **DataSettings** — export data, clear data (with confirmation)
7. **ImportSection** — MacroFactor .xlsx upload with progress and summary

### MacroFactor Import Feature

In-app import (Settings → Import Data → MacroFactor). User uploads their `.xlsx` export file.

**What gets imported from each sheet:**

| Sheet | → Target Table | Data |
|-------|---------------|------|
| Calories & Macros | `daily_intake` (new) | 228 days of daily cal/P/F/C totals |
| Scale Weight | `weight_log` | 243 daily weigh-ins (weight only, skip body fat %) |
| Expenditure | `tdee_history` | 243 daily TDEE estimates |
| Weight Trend | `tdee_history.weight_used` | Smoothed trend weight (stored alongside TDEE) |
| Favorites (10) | `foods` | Full macro data — name, serving size, cal/P/F/C |
| History (68) | `foods` | Food names only (no macros) — user fills in macros manually over time |

**Sheets skipped:**
- Micronutrients — not tracked in our app
- Partial Logging — not needed

**Import UX flow:**
1. User clicks "Import from MacroFactor" in Settings
2. File picker opens, user selects `.xlsx`
3. Backend parses file, shows preview summary (e.g. "228 days of intake, 243 weigh-ins, 10 foods with macros, 68 food names")
4. User confirms import
5. Progress bar during import
6. Success summary with counts

**Import rules:**
- Duplicate dates are skipped (no overwrite)
- History foods imported with name only, all macro fields null — appear in My Foods with a "needs macros" badge
- Favorites imported as complete food entries
- Weight entries use `Weight (lbs)` column only (no body fat %)
- Dates converted from Excel serial numbers to ISO dates

### Data Flow
- `GET /api/user` → populate all fields
- `PUT /api/user` → save changes (debounced or on blur)
- `POST /api/import/macrofactor` → file upload, parse, insert
- `GET /api/import/status` → check if import already done

### Deliverable
All settings editable and persisted. Changing weight/activity recalculates TDEE. Theme toggle works globally. MacroFactor import functional with preview and confirmation.

---

## Phase 8 — Weight Logging & TDEE Integration

**Goal:** Daily weight input and adaptive TDEE recalculation.

### Tasks
1. **Weight input** — quick-add weight from dashboard or settings (modal with number input)
2. **TDEE recalculation** — on new weight entry, run EMA: `new_tdee = α * calculated_tdee + (1 - α) * previous_tdee`
3. **History persistence** — save daily TDEE snapshots to `tdee_history` table
4. **Weight trend smoothing** — apply EMA to weight data for trend line vs raw data points
5. **Dashboard integration** — TDEE vs Intake chart updates with fresh calculations

### TDEE Algorithm (Exponential Moving Average)
```
For each day with weight + intake data:
  calculated_tdee = intake + (prev_weight - current_weight) * 3500 / days_between
  smoothed_tdee = α * calculated_tdee + (1 - α) * prev_smoothed_tdee

Where α = user's smoothing_factor (default 0.1)
Lower α = smoother/slower adaptation
Higher α = more responsive/noisier
```

### Deliverable
Weight logging works. TDEE adapts over time based on real intake vs weight change. Analytics reflect accurate trends.

---

## Phase 9 — Polish & PWA Finalization

**Goal:** Production-ready PWA with smooth UX.

### Tasks
1. **Animations** — page transitions, ring animation on load, chart draw-in effects
2. **Loading states** — skeleton screens for data fetches
3. **Empty states** — friendly messages when no data exists ("Log your first meal!")
4. **Offline support** — cache API responses, queue mutations for sync
5. **PWA install prompt** — custom install banner
6. **Touch gestures** — swipe to delete food log entries
7. **Keyboard navigation** — accessible focus management
8. **Error boundaries** — graceful error handling with retry
9. **Performance audit** — Lighthouse PWA score, bundle optimization
10. **Final responsive QA** — test all breakpoints, all views

### Deliverable
Installable PWA. Works offline. Smooth animations. Accessible. Production-ready.

---

## File Structure

```
food-tracker/
├── docs/
│   ├── wireframes/mockup.html
│   ├── ScreenShots/
│   └── IMPLEMENTATION_PLAN.md
├── client/                          # Frontend
│   ├── public/
│   │   ├── icons/
│   │   └── manifest.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── styles/
│   │   │   ├── variables.css        # Design system tokens
│   │   │   ├── global.css           # Reset + base styles
│   │   │   └── fonts.css
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx
│   │   │   └── DateContext.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts
│   │   │   └── useTdee.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── BottomNav.tsx
│   │   │   │   ├── PageHeader.tsx
│   │   │   │   └── AppLayout.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── DayNavigator.tsx
│   │   │   │   ├── WeekStrip.tsx
│   │   │   │   ├── CalorieRing.tsx
│   │   │   │   ├── MacroCard.tsx
│   │   │   │   └── TdeeIntakeChart.tsx
│   │   │   ├── log/
│   │   │   │   ├── LogSummary.tsx
│   │   │   │   ├── Timeline.tsx
│   │   │   │   ├── FoodEntry.tsx
│   │   │   │   └── AddFoodModal.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── TdeeCard.tsx
│   │   │   │   ├── WeightTrendCard.tsx
│   │   │   │   ├── AvgIntakeCard.tsx
│   │   │   │   ├── ActualVsGoalCard.tsx
│   │   │   │   └── TdeeBreakdownCard.tsx
│   │   │   ├── foods/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── CategoryTabs.tsx
│   │   │   │   ├── FoodDbList.tsx
│   │   │   │   └── FoodForm.tsx
│   │   │   └── settings/
│   │   │       ├── ProfileSettings.tsx
│   │   │       ├── GoalSettings.tsx
│   │   │       ├── TdeeSettings.tsx
│   │   │       ├── AppSettings.tsx
│   │   │       └── ImportSection.tsx
│   │   └── views/
│   │       ├── DashboardView.tsx
│   │       ├── FoodLogView.tsx
│   │       ├── AnalyticsView.tsx
│   │       ├── FoodsView.tsx
│   │       └── SettingsView.tsx
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                          # Backend
│   ├── src/
│   │   ├── index.ts
│   │   ├── db/
│   │   │   ├── connection.ts
│   │   │   ├── schema.ts
│   │   │   └── seed.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   ├── import.ts
│   │   │   ├── foods.ts
│   │   │   ├── foodLog.ts
│   │   │   ├── weight.ts
│   │   │   └── analytics.ts
│   │   ├── services/
│   │   │   ├── tdee.ts              # EMA calculation engine
│   │   │   └── macrofactorImport.ts # .xlsx parser + data mapper
│   │   └── middleware/
│   │       └── errorHandler.ts
│   ├── drizzle.config.ts
│   ├── tsconfig.json
│   └── package.json
└── README.md
```

---

## Implementation Order Summary

| Phase | Focus                              | Depends On |
|-------|------------------------------------|------------|
| 1     | Scaffolding + Design System + Shell| —          |
| 2     | Backend + Database + API           | —          |
| 3     | Dashboard View                     | 1, 2       |
| 4     | Food Log View                      | 1, 2       |
| 5     | My Foods Database                  | 1, 2       |
| 6     | Analytics View                     | 1, 2       |
| 7     | Settings + MacroFactor Import       | 1, 2       |
| 8     | Weight Logging + TDEE Integration  | 3, 6, 7    |
| 9     | Polish + PWA Finalization          | All        |

> **Phases 1 & 2** can be built in parallel.
> **Phases 3–7** can be built in any order after 1 & 2 are complete.
> **Phase 8** ties everything together.
> **Phase 9** is final polish.
