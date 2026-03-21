# Architecture — Fuel Food Tracker

## 1. System Overview

Fuel is a full-stack web application following a classic client-server architecture with a PostgreSQL database. In production, Nginx serves the static frontend and reverse-proxies API requests to the Express backend.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (PWA)                      │
│  React 18 + Vite + CSS Modules + React Router v6        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (JSON)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Nginx (Production)                     │
│  Static files · Gzip · Cache · SPA fallback             │
│  Reverse proxy /api/* → http://api:3001                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                Express.js API Server                     │
│  Helmet · CORS · Rate Limiting · Morgan · Zod           │
│  Routes → Services → Drizzle ORM                        │
└──────────────────────┬──────────────────────────────────┘
                       │ SQL (postgres.js)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL 16 (Alpine)                      │
│  6 tables · 5 enums · 12 indexes                        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
Food-Tracker/
├── client/                        # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.tsx                # Router setup
│   │   ├── main.tsx               # Entry point with providers
│   │   ├── components/
│   │   │   ├── layout/            # AppLayout, Sidebar, BottomNav, PageHeader
│   │   │   ├── dashboard/         # CalorieRing, MacroCard, WeekStrip, etc.
│   │   │   ├── log/               # Timeline, FoodEntry, AddFoodModal, etc.
│   │   │   ├── foods/             # SearchBar, CategoryTabs, FoodForm, etc.
│   │   │   ├── analytics/         # TdeeCard, WeightTrendCard, etc.
│   │   │   ├── settings/          # SettingsGroup, SettingsField, ImportSection
│   │   │   └── ui/                # Toast, EmptyState, ErrorBoundary, Skeleton
│   │   ├── context/               # ThemeContext, DateContext
│   │   ├── hooks/                 # useApi, apiFetch
│   │   ├── views/                 # 5 page components
│   │   ├── styles/                # variables.css, global.css
│   │   └── types/                 # css.d.ts
│   ├── public/                    # Static assets, PWA icons
│   ├── vite.config.ts             # Vite + PWA configuration
│   └── package.json
│
├── server/                        # Backend (Express + PostgreSQL)
│   ├── src/
│   │   ├── index.ts               # Express app setup
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle schema (6 tables)
│   │   │   ├── connection.ts      # Database client
│   │   │   └── seed.ts            # Default data
│   │   ├── routes/
│   │   │   ├── user.ts            # GET/PUT /api/user
│   │   │   ├── foods.ts           # CRUD /api/foods
│   │   │   ├── foodLog.ts         # CRUD /api/log
│   │   │   ├── weight.ts          # CRUD /api/weight
│   │   │   ├── analytics.ts       # GET /api/analytics/*
│   │   │   ├── dashboard.ts       # GET /api/dashboard
│   │   │   └── import.ts          # POST /api/import/*
│   │   ├── services/
│   │   │   ├── tdee.ts            # TDEE engine (EMA, BMR)
│   │   │   └── macrofactorImport.ts  # .xlsx parser
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts    # AppError + Zod validation
│   │   │   └── userMiddleware.ts  # User cache (30s TTL)
│   │   └── validation/
│   │       └── schemas.ts         # Zod validation schemas
│   ├── drizzle.config.ts          # ORM config
│   └── package.json
│
├── nginx/
│   └── nginx.conf                 # Reverse proxy config
├── Dockerfile                     # 6-stage multi-stage build
├── docker-compose.yml             # 5-service orchestration
├── .env.docker.example            # Environment template
└── docs/                          # Documentation
```

---

## 3. Frontend Architecture

### 3.1 Provider Stack

The application wraps the root component in a layered provider stack:

```
BrowserRouter
 └── ThemeProvider         — Dark/light theme state
      └── DateProvider     — Shared date for dashboard/log
           └── ErrorBoundary  — Catches render errors
                └── ToastProvider  — Notification system
                     └── App       — Router + views
```

### 3.2 Routing

React Router v6 with a layout route pattern:

```
<AppLayout>              ← Shell (sidebar + main + bottomnav)
  <Outlet />             ← Rendered by child routes:
    /           → DashboardView
    /log        → FoodLogView
    /analytics  → AnalyticsView
    /foods      → FoodsView
    /settings   → SettingsView
```

### 3.3 State Management

No external state library. State is managed through:

| Mechanism | Scope | Usage |
|-----------|-------|-------|
| React Context | Global | Theme (dark/light), Date (current day) |
| Component State | Local | Form inputs, modals, UI toggles |
| `useApi` Hook | Per-component | Server data fetching + caching |
| URL | Navigation | Current view route |

### 3.4 Data Flow

```
View mounts
  → useApi(path) fetches data
  → Component renders with data
  → User action (click, submit)
  → apiFetch(POST/PUT/DELETE)
  → refetch() to refresh data
  → Toast notification
```

### 3.5 Styling Architecture

**CSS Modules** scope all styles to components. **CSS Custom Properties** define the design system.

```
variables.css (tokens)
  ├── Colors (accent, semantic)
  ├── Spacing (4–64px scale)
  ├── Typography (Sora, Outfit)
  ├── Border radii
  ├── Transitions
  └── Layout constants

global.css (base)
  ├── Reset (box-sizing, margins)
  ├── Focus ring
  ├── Scrollbar styling
  └── Reduced motion support

*.module.css (per-component)
  └── Scoped class names via CSS Modules
```

**Theming:** ThemeContext sets `data-theme="dark|light"` on `<html>`. Variables.css defines both theme palettes using this attribute selector.

### 3.6 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| < 768px | Bottom navigation, single column |
| >= 768px | Sidebar navigation (240px), main content area |

Layout managed by `AppLayout` using CSS media queries.

---

## 4. Backend Architecture

### 4.1 Middleware Pipeline

Requests pass through middleware in this order:

```
Request
  → helmet()              # Security headers + CSP
  → cors()                # CORS policy
  → express.json()        # Body parsing (16KB limit)
  → cookieParser()        # Cookie parsing (for CSRF)
  → morgan('short')       # Request logging
  → csrfMiddleware()      # CSRF double-submit cookie validation
  → rateLimit()           # 200 req/15min (API), 5 req/hr (import)
  → requestTimeout()      # 30-second timeout
  → userMiddleware()      # Load/cache user, attach to req
  → route handler         # Business logic
  → errorHandler()        # Catch-all error response
```

### 4.2 Route Architecture

Each route module exports an Express Router:

```typescript
// Pattern used in all route files
const router = Router();
router.get('/', handler);
router.post('/', handler);
export default router;
```

Routes are mounted in `index.ts`:
```
/api/user       → user.ts
/api/foods      → foods.ts
/api/log        → foodLog.ts
/api/weight     → weight.ts
/api/analytics  → analytics.ts
/api/dashboard  → dashboard.ts
/api/import     → import.ts
```

### 4.3 Service Layer

Services contain pure business logic separated from HTTP concerns:

| Service | Responsibility |
|---------|---------------|
| `tdee.ts` | TDEE calculation (EMA), BMR (Mifflin-St Jeor), weight smoothing |
| `calorieTarget.ts` | Computed calorie target from adaptive TDEE + objective + pace |
| `dailyIntakeData.ts` | Merge imported + logged daily intake data |
| `macrofactorImport.ts` | Parse MacroFactor .xlsx, validate sheets, upsert data in transaction |
| `csvImport.ts` | Parse CSV files for bulk food import |
| `dataExport.ts` | Full user data export as JSON with HMAC-SHA256 checksum |
| `dataImport.ts` | Restore user data from JSON export with integrity verification |

### 4.4 Error Handling

```
AppError(statusCode, message)
  → Custom error class with HTTP status code
  → Thrown anywhere in route handlers

validate(schema, data)
  → Wraps Zod parsing
  → Throws AppError(400) with field-level error messages

errorHandler middleware
  → Catches all thrown errors
  → AppError → returns { error: message } with statusCode
  → Other → returns 500 Internal Server Error
```

### 4.5 Validation

All input validated with Zod schemas at route boundaries:

```typescript
// In route handler
const body = validate(foodCreateSchema, req.body);
// body is now typed and validated
```

Schemas defined in `validation/schemas.ts` with ranges, formats, and defaults.

---

## 5. Database Architecture

### 5.1 Entity Relationship

```
users (1)
  ├── foods (many)         — User's food database
  ├── foodLog (many)       — Daily food entries
  │     └── foods (1)      — References a food item
  ├── dailyIntake (many)   — Aggregated daily macros
  ├── weightLog (many)     — Daily weight entries
  └── tdeeHistory (many)   — TDEE estimates over time
```

### 5.2 Index Strategy

Performance-critical indexes:

| Index | Table | Columns | Type |
|-------|-------|---------|------|
| `foods_user_id_idx` | foods | userId | Standard |
| `food_log_user_id_idx` | foodLog | userId | Standard |
| `food_log_food_id_idx` | foodLog | foodId | Standard |
| `food_log_user_date_idx` | foodLog | userId, date | Composite |
| `daily_intake_user_date_idx` | dailyIntake | userId, date | Unique |
| `weight_log_user_date_idx` | weightLog | userId, date | Unique |
| `tdee_history_user_date_idx` | tdeeHistory | userId, date | Unique |

### 5.3 Data Flow: TDEE Calculation

```
User logs weight (POST /api/weight)
  → Upsert weight entry
  → Update user.currentWeight
  → Fetch last 90 days of weight + intake data
  → calculateTdeeHistory() with EMA smoothing
  → Batch upsert tdee_history rows
  → Response with weight entry
```

---

## 6. Key Design Decisions

### 6.1 Single-User Model
**Decision:** No authentication system. Single user per instance.
**Rationale:** Self-hosted app for personal use. Eliminates auth complexity, session management, and multi-tenant data isolation. User ID is loaded from the database and cached.

### 6.2 CSS Modules over Utility-First CSS
**Decision:** CSS Modules with custom properties instead of Tailwind.
**Rationale:** Component-scoped styles without class name collisions. Custom properties provide a design system without build-time dependency.

### 6.3 Custom SVG Charts
**Decision:** Hand-built SVG chart components instead of a charting library.
**Rationale:** Smaller bundle size. Only 4 chart types needed (ring, line, area, bar). Full control over styling and animation.

### 6.4 Drizzle ORM
**Decision:** Drizzle over Prisma or raw SQL.
**Rationale:** Type-safe queries with minimal runtime overhead. Schema-as-code with push-based migrations. Lightweight compared to Prisma.

### 6.5 ExcelJS for Import
**Decision:** Replaced `xlsx` with `exceljs` (Security Phase 3).
**Rationale:** `xlsx` had known prototype pollution and ReDoS vulnerabilities. ExcelJS provides streaming support and is actively maintained.

### 6.6 EMA for TDEE
**Decision:** Exponential Moving Average instead of simple moving average.
**Rationale:** EMA responds faster to recent changes while dampening noise. User-configurable smoothing factor (0.05–0.30) allows tuning responsiveness.

### 6.7 Consolidated API Endpoints
**Decision:** Dashboard and analytics summary endpoints instead of multiple granular calls.
**Rationale:** Reduces HTTP round trips (4–8 calls to 1). Server-side parallel execution via `Promise.all`. Significant mobile performance improvement.

---

## 7. Deployment Architecture

### Production (Docker Compose)

```
┌──────────────────────────────────────────────┐
│              Docker Network                   │
│                                               │
│  ┌─────────┐   ┌──────────┐   ┌───────────┐ │
│  │  nginx   │──▶│   api    │──▶│    db     │ │
│  │  :80     │   │  :3001   │   │  :5432    │ │
│  │ (static  │   │ (Express)│   │ (Postgres)│ │
│  │  + proxy)│   │          │   │           │ │
│  └─────────┘   └──────────┘   └───────────┘ │
│       ▲                                       │
│       │ port 80                               │
└───────┼───────────────────────────────────────┘
        │
    Internet / LAN
```

### Startup Sequence

```
1. db        → PostgreSQL starts, healthcheck passes
2. migrate   → drizzle-kit push (schema sync)
3. seed      → Default user + foods (idempotent)
4. api       → Express server starts on :3001
5. nginx     → Serves client, proxies /api/*
```

### Development

```
┌───────────┐  proxy /api/*  ┌───────────┐     ┌───────────┐
│   Vite    │ ─────────────▶ │  Express  │ ──▶ │ PostgreSQL│
│   :5173   │                │   :3001   │     │   :5432   │
│  (HMR)    │                │  (tsx)    │     │           │
└───────────┘                └───────────┘     └───────────┘
```

---

## 8. Security Architecture

### Defense Layers

| Layer | Implementation |
|-------|---------------|
| HTTP Headers | Helmet (CSP, X-Frame-Options, HSTS, etc.) |
| Rate Limiting | 200 req/15min API, 5 req/hr import |
| Input Validation | Zod schemas on all route inputs |
| Body Limits | 16KB JSON, 10MB file upload |
| File Validation | XLSX magic byte check, row limits |
| SQL Safety | Drizzle ORM parameterized queries |
| CSRF | Double-submit cookie via csrf-csrf |
| CORS | Configurable origin whitelist |
| Error Masking | Generic messages in production |

See [SECURITY.md](SECURITY.md) for the full security model.

---

## 9. Performance Architecture

### Optimizations Applied

| Fix | Technique | Impact |
|-----|-----------|--------|
| User Cache | 30-second in-memory TTL cache | ~100 queries/min → 2–3/min |
| Dashboard API | Single consolidated endpoint | 4–5 round trips → 1 |
| Analytics API | Parallel query execution | 6–8 sequential → parallel |
| Batch Upsert | SQL INSERT...ON CONFLICT | 60–90 queries → ~8 |
| DB Indexes | Composite indexes on hot paths | Full scans → index lookups |
| Shared Helper | Reuse intake aggregation | Eliminate duplicate queries |

See [PERFORMANCE_FIXES.md](PERFORMANCE_FIXES.md) for implementation details.
