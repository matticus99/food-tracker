# Frontend Guide — Fuel Food Tracker

**Framework:** React 18 + TypeScript
**Build Tool:** Vite 6
**Styling:** CSS Modules + CSS Custom Properties
**Routing:** React Router v6

---

## 1. Project Structure

```
client/src/
├── App.tsx                    # Router configuration
├── main.tsx                   # Entry point with provider stack
├── components/
│   ├── layout/                # App shell components
│   │   ├── AppLayout.tsx      # Main layout (sidebar + main + bottomnav)
│   │   ├── Sidebar.tsx        # Desktop navigation (≥768px)
│   │   ├── BottomNav.tsx      # Mobile navigation (<768px)
│   │   └── PageHeader.tsx     # Page title + optional date
│   ├── dashboard/             # Dashboard-specific components
│   │   ├── DayNavigator.tsx   # Date navigation (< Today >)
│   │   ├── WeekStrip.tsx      # Mon-Sun day selector
│   │   ├── CalorieRing.tsx    # SVG circular progress
│   │   ├── MacroCard.tsx      # Protein/fat/carbs bars
│   │   ├── TdeeIntakeChart.tsx# 7-day trend chart
│   │   └── WeightModal.tsx    # Weight entry modal
│   ├── log/                   # Food log components
│   │   ├── AddFoodModal.tsx   # Search + select + servings modal
│   │   ├── EditFoodModal.tsx  # Edit food entry modal with unit conversion
│   │   ├── FoodEntry.tsx      # Single log entry (swipe-to-delete)
│   │   ├── Timeline.tsx       # Hourly timeline view
│   │   └── LogSummary.tsx     # Daily macro summary badges
│   ├── foods/                 # Foods database components
│   │   ├── SearchBar.tsx      # Search input with clear
│   │   ├── CategoryAccordion.tsx # Category filter accordion
│   │   ├── FoodDbList.tsx     # Food list with macros
│   │   └── FoodForm.tsx       # Create/edit food modal
│   ├── analytics/             # Analytics chart components
│   │   ├── PeriodSelector.tsx # 7d/14d/30d toggle
│   │   ├── TdeeCard.tsx       # TDEE trend + sparkline
│   │   ├── WeightTrendCard.tsx# Weight trend + change indicator
│   │   ├── AvgIntakeCard.tsx  # Average intake bar chart
│   │   ├── ActualVsGoalCard.tsx # Actual vs goal line chart
│   │   └── TdeeBreakdownCard.tsx # BMR breakdown grid
│   ├── settings/              # Settings components
│   │   ├── SettingsGroup.tsx  # Card group container
│   │   ├── SettingsField.tsx  # Label + input wrapper
│   │   ├── ImportSection.tsx  # MacroFactor upload
│   │   ├── DataExportImportSection.tsx # Full data export/import
│   │   ├── CsvImportSection.tsx # CSV food import
│   │   └── TdeeBreakdownModal.tsx # TDEE breakdown modal
│   └── ui/                    # Shared UI primitives
│       ├── Toast.tsx          # Notification system (provider + hook)
│       ├── EmptyState.tsx     # Empty content placeholder
│       ├── ErrorBoundary.tsx  # React error boundary
│       └── Skeleton.tsx       # Loading placeholders
├── context/
│   ├── ThemeContext.tsx        # Dark/light theme management
│   └── DateContext.tsx         # Shared date state
├── hooks/
│   └── useApi.ts              # Fetch wrapper + data hook
├── views/
│   ├── DashboardView.tsx      # Dashboard page
│   ├── FoodLogView.tsx        # Food log page
│   ├── AnalyticsView.tsx      # Analytics page
│   ├── FoodsView.tsx          # Foods database page
│   └── SettingsView.tsx       # Settings page
├── constants/
│   ├── categories.ts          # Category config and helpers
│   └── timeBlocks.ts          # Time-of-day block definitions
├── utils/
│   ├── date.ts                # Date utility functions
│   └── unitConversions.ts     # Weight/serving unit conversions
├── styles/
│   ├── variables.css          # Design tokens (colors, spacing, typography)
│   └── global.css             # Reset + base styles
└── types/
    └── css.d.ts               # CSS modules TypeScript declaration
```

---

## 2. Provider Stack

Providers wrap the app in `main.tsx`:

```
BrowserRouter              ← URL-based routing
  └── ThemeProvider        ← Dark/light theme (localStorage + system)
       └── DateProvider    ← Shared date for dashboard/log sync
            └── ErrorBoundary  ← Catches render errors globally
                 └── ToastProvider  ← Notification system
                      └── App      ← Routes
```

---

## 3. Context APIs

### ThemeContext

**File:** `context/ThemeContext.tsx`
**Hook:** `useTheme()`

```typescript
interface ThemeContextValue {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
}
```

| Feature | Detail |
|---------|--------|
| Persistence | `localStorage` key: `food-tracker-theme` |
| System fallback | `prefers-color-scheme` media query |
| DOM binding | Sets `data-theme` on `<html>` element |
| Transitions | CSS custom properties enable smooth theme switching |

### DateContext

**File:** `context/DateContext.tsx`
**Hook:** `useDate()`

```typescript
interface DateContextValue {
  date: Date;               // Current Date object
  dateStr: string;          // ISO "YYYY-MM-DD"
  setDate: (d: Date) => void;
  goNext: () => void;       // +1 day
  goPrev: () => void;       // -1 day
  goToday: () => void;      // Reset to today
  isToday: boolean;         // Whether date === today
}
```

Shared between DashboardView and FoodLogView so date selection stays in sync when navigating between views.

---

## 4. Data Fetching

### `apiFetch<T>(path, options?)`

**File:** `hooks/useApi.ts`

Low-level fetch wrapper:
- Prepends `/api` to all paths
- Sets `Content-Type: application/json`
- Throws on non-OK responses with server error message
- Returns typed response body

### `useApi<T>(path: string | null)`

**File:** `hooks/useApi.ts`

React hook for data fetching:

```typescript
const { data, loading, error, refetch } = useApi<Food[]>('/foods');
```

| Return | Type | Description |
|--------|------|-------------|
| `data` | `T \| null` | Response data (null while loading) |
| `loading` | `boolean` | True during fetch |
| `error` | `string \| null` | Error message if fetch failed |
| `refetch` | `() => void` | Manually re-trigger fetch |

**Conditional fetch:** Pass `null` to skip fetching:
```typescript
// Only fetch when foodId is set
const { data } = useApi<Food>(foodId ? `/foods/${foodId}` : null);
```

---

## 5. Views (Pages)

### DashboardView

**Route:** `/`
**Data:** `GET /api/dashboard?date={dateStr}`

Displays daily nutrition overview with calorie ring, macro bars, TDEE chart, and weight entry.

**Key Computations:**
- Totals calculated from log entries: `entries.reduce(...)` for calories, protein, fat, carbs
- Multiplied by servings: `food.calories * entry.servings`
- Chart averages computed from last 7 days of TDEE/intake data
- Week strip dots from intake data dates

### FoodLogView

**Route:** `/log`
**Data:** `GET /api/log?date={dateStr}`

Vertical timeline grouped by hour with food entries and add buttons.

**Features:**
- FAB button for quick add at current hour
- Swipe-to-delete on mobile entries
- Toast on add/delete

### AnalyticsView

**Route:** `/analytics`
**Data:** `GET /api/analytics/summary?days=30`

5 analytics cards (TDEE, weight, intake, vs goal, BMR breakdown) with period selectors.

### FoodsView

**Route:** `/foods`
**Data:** `GET /api/foods?search=...&category=...`

Food database with search, category filter, and CRUD modal.

### SettingsView

**Route:** `/settings`
**Data:** `GET /api/user`

Profile, goals, TDEE config, theme, and import sections. Auto-saves on blur/change.

---

## 6. Component Reference

### Layout Components

| Component | Props | Description |
|-----------|-------|-------------|
| `AppLayout` | — | Shell: sidebar (desktop) + main + bottomnav (mobile) |
| `Sidebar` | — | Desktop nav with 5 links + theme toggle |
| `BottomNav` | — | Mobile nav with 5 icon tabs |
| `PageHeader` | `title, date?` | Page heading with optional date subtitle |

### Dashboard Components

| Component | Props | Description |
|-----------|-------|-------------|
| `DayNavigator` | — | `< Today >` navigation using DateContext |
| `WeekStrip` | `datesWithData?` | Mon-Sun bar with data dots |
| `CalorieRing` | `consumed, target` | Animated SVG donut chart |
| `MacroCard` | `protein*, fat*, carbs*` (current + target) | 3 horizontal progress bars |
| `TdeeIntakeChart` | `data[], avgTdee, avgIntake` | SVG area chart (TDEE vs intake) |
| `WeightModal` | `open, date, currentWeight?, onClose, onSaved` | Weight entry modal |

### Log Components

| Component | Props | Description |
|-----------|-------|-------------|
| `AddFoodModal` | `open, hour, date, onClose, onAdded` | Search → select → confirm food |
| `FoodEntry` | `id, emoji, name, servingLabel, servings, calories, onDelete` | Log entry with swipe-to-delete |
| `Timeline` | `entries[], onDelete, onAddAtHour` | Hourly timeline (5AM–10PM) |
| `EditFoodModal` | `entry, onClose, onSaved` | Edit food entry with unit conversion and time-of-day |
| `LogSummary` | `calories, protein, fat, carbs` | 4 summary badges |

### Foods Components

| Component | Props | Description |
|-----------|-------|-------------|
| `SearchBar` | `value, onChange` | Search input with clear button |
| `CategoryAccordion` | `active, onChange` | Category filter buttons |
| `FoodDbList` | `foods[], onEdit, onDelete, onAdd` | Food list with macro columns |
| `FoodForm` | `open, food?, onClose, onSaved` | Create/edit food modal |

### Analytics Components

| Component | Props | Description |
|-----------|-------|-------------|
| `PeriodSelector` | `periods[], active, onChange` | 7d/14d/30d toggle |
| `TdeeCard` | `data[]` | TDEE sparkline with latest value |
| `WeightTrendCard` | `data[]` | Weight trend with change indicator |
| `AvgIntakeCard` | `data[], calorieTarget` | Average intake bar chart |
| `ActualVsGoalCard` | `data[], calorieTarget` | Actual vs goal line chart |
| `TdeeBreakdownCard` | `data` | BMR / Activity / Est. TDEE / Target grid |

### Settings Components

| Component | Props | Description |
|-----------|-------|-------------|
| `SettingsGroup` | `title, children` | Card container with heading |
| `SettingsField` | `label, suffix?, children` | Label + input wrapper |
| `ImportSection` | — | MacroFactor .xlsx upload |
| `DataExportImportSection` | — | Full JSON data export and restore |
| `CsvImportSection` | — | CSV bulk food import |
| `TdeeBreakdownModal` | `open, data, onClose` | TDEE calculation breakdown |

### UI Primitives

| Component | Props | Description |
|-----------|-------|-------------|
| `Toast` (Provider) | — | Notification system. Hook: `useToast().toast(msg, type)` |
| `EmptyState` | `icon, title, description?, action?` | Empty content placeholder |
| `ErrorBoundary` | `children` | Catches render errors |
| `Skeleton` | `width?, height?, radius?` | Loading placeholder |
| `SkeletonRing` | — | Circular loading placeholder |
| `SkeletonCard` | `lines?` | Card loading placeholder |

---

## 7. Design System

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-indigo` | #6366F1 | Primary, calories, intake |
| `--accent-orange` | #F97316 | Secondary, fat, TDEE |
| `--accent-emerald` | #10B981 | Success, carbs, under goal |
| `--accent-cyan` | #06B6D4 | Info, protein |
| `--accent-rose` | #F43F5E | Error, over goal |
| `--accent-violet` | #8B5CF6 | Analytics, weight trend |

### Typography

| Token | Font | Usage |
|-------|------|-------|
| `--font-display` | Sora | Headings, numbers |
| `--font-body` | Outfit | Body text, labels |

### Spacing Scale

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |
| `--space-3xl` | 64px |

### Dark Theme
- Background: #0B0C10 (base) → #13151B (surface) → #1B1D25 (elevated)
- Text: #F1F5F9 (primary) → #94A3B8 (secondary) → #64748B (tertiary)
- Borders: rgba white with 6–16% opacity

### Light Theme
- Background: #F8FAFC (base) → #FFFFFF (surface) → #F1F5F9 (elevated)
- Text: #0F172A (primary) → #475569 (secondary) → #94A3B8 (tertiary)
- Borders: rgba black with 4–14% opacity

### Transitions
- `--transition-fast`: 150ms
- `--transition-medium`: 300ms
- `--transition-slow`: 500ms
- `--ease-out`: cubic-bezier(0.16, 1, 0.3, 1)

---

## 8. Responsive Breakpoints

| Width | Layout |
|-------|--------|
| < 768px | BottomNav visible, Sidebar hidden, single column |
| >= 768px | Sidebar visible (240px), BottomNav hidden, main content area |

**Layout Constants:**
- `--sidebar-width`: 240px
- `--bottomnav-height`: 72px
- `--content-max-width`: 960px

---

## 9. PWA Configuration

**Plugin:** `vite-plugin-pwa` with `autoUpdate` strategy

| Setting | Value |
|---------|-------|
| App Name | Fuel — Food Tracker |
| Short Name | Fuel |
| Display | Standalone |
| Theme Color | #6366F1 |
| Background | #0B0C10 |
| Icons | SVG (any size + maskable) |

---

## 10. Testing

**Framework:** Vitest + React Testing Library
**Environment:** jsdom

```bash
npm run test         # Run once
npm run test:watch   # Watch mode
```

**Test file pattern:** `src/**/*.test.{ts,tsx}`
**Setup file:** `src/test/setup.ts`

---

## 11. Build & Dev

### Development
```bash
cd client
npm install
npm run dev          # Starts Vite dev server on :5173
```

Vite proxies `/api/*` requests to `http://localhost:3001` (Express backend).

### Production Build
```bash
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build locally
```

Output goes to `client/dist/` and is served by Nginx in production.
