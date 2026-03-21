# Coding Standards — Fuel Food Tracker

This document covers the coding conventions, patterns, and best practices used throughout the project.

---

## 1. Language & TypeScript

### Strict Mode
Both client and server use TypeScript strict mode (`"strict": true`).

### Type Annotations
- Props interfaces defined at the top of each component file
- API response types defined in view files or inline
- No `any` types — use proper typing or `unknown` with validation

### Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Components | PascalCase | `CalorieRing`, `FoodEntry` |
| Files (components) | PascalCase.tsx | `CalorieRing.tsx` |
| Files (utilities) | camelCase.ts | `useApi.ts` |
| CSS Modules | PascalCase.module.css | `CalorieRing.module.css` |
| Variables/functions | camelCase | `dateStr`, `handleSubmit` |
| Constants | camelCase or UPPER_SNAKE | `CACHE_TTL_MS` |
| Interfaces | PascalCase | `PageHeaderProps` |
| Enums (DB) | snake_case | `food_category` |
| DB columns | camelCase | `timeHour`, `userId` |
| API routes | kebab-case | `/api/weight-trend` |
| CSS variables | kebab-case | `--accent-indigo` |

---

## 2. React Patterns

### Component Structure

Components follow a consistent order:

```typescript
// 1. Imports
import { useState, useCallback } from 'react';
import styles from './MyComponent.module.css';

// 2. Types/Interfaces
interface Props {
  title: string;
  onClose: () => void;
}

// 3. Component
export default function MyComponent({ title, onClose }: Props) {
  // 4. Hooks (state, context, effects)
  const [value, setValue] = useState('');
  const { date } = useDate();

  // 5. Handlers
  const handleSubmit = useCallback(() => { ... }, []);

  // 6. Derived state
  const isValid = value.length > 0;

  // 7. Render
  return (
    <div className={styles.container}>
      ...
    </div>
  );
}
```

### Default Exports
All components use `export default function`. Named exports used only for hooks and utilities.

### Hooks Usage

| Hook | Usage |
|------|-------|
| `useState` | Local component state |
| `useCallback` | Handlers passed to children |
| `useMemo` | Expensive derived values |
| `useEffect` | Side effects (data fetch, DOM manipulation) |
| `useRef` | DOM references, mutable values |

### Context Pattern
```typescript
// Create context with undefined default
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Custom hook with guard
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  // State + logic
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

### Modal Pattern
Modals are controlled by parent state:

```typescript
// Parent
const [modalOpen, setModalOpen] = useState(false);
<MyModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={refetch} />

// Modal
function MyModal({ open, onClose, onSaved }: Props) {
  if (!open) return null;
  // ...
}
```

### Data Flow Pattern
Views own data fetching; child components receive data as props:

```typescript
// View (data owner)
function DashboardView() {
  const { data, refetch } = useApi('/dashboard');
  return <CalorieRing consumed={totals.calories} target={data.user.calorieTarget} />;
}

// Component (presentational)
function CalorieRing({ consumed, target }: Props) {
  // Pure rendering, no data fetching
}
```

---

## 3. CSS Patterns

### CSS Modules
Every component has a co-located `.module.css` file:

```
components/dashboard/
  ├── CalorieRing.tsx
  └── CalorieRing.module.css
```

Usage:
```typescript
import styles from './CalorieRing.module.css';
<div className={styles.container}>
```

### Design Tokens
All colors, spacing, and typography reference CSS custom properties:

```css
/* Do this */
.card {
  background: var(--bg-surface);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

/* Don't do this */
.card {
  background: #13151B;
  padding: 16px;
  border-radius: 12px;
  color: #F1F5F9;
}
```

### Theming
Theme-specific values are defined via `[data-theme]` selectors in `variables.css`. Components never reference theme-specific colors directly.

### Responsive Design
Media queries at the 768px breakpoint:

```css
.sidebar {
  display: flex;
}

@media (max-width: 767px) {
  .sidebar {
    display: none;
  }
}
```

### Animation
- Use `--transition-fast` (150ms) for micro-interactions
- Use `--transition-medium` (300ms) for reveals/transitions
- Use `--ease-out` for natural motion
- Respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; }
  }
  ```

---

## 4. Backend Patterns

### Route Handler Structure

```typescript
router.get('/', async (req, res, next) => {
  try {
    // 1. Validate input
    const { days } = validate(daysQuerySchema, req.query);

    // 2. Query database
    const results = await db.select()
      .from(table)
      .where(eq(table.userId, req.userId));

    // 3. Return response
    res.json(results);
  } catch (err) {
    next(err);  // Forward to error handler
  }
});
```

### Error Handling
```typescript
// Throw AppError for known errors
throw new AppError(404, 'Food not found');

// Use validate() for input validation
const body = validate(foodCreateSchema, req.body);
// Throws AppError(400) with field-level messages on failure
```

### Database Query Pattern
Use Drizzle's query builder for type-safe SQL:

```typescript
// Select with joins
const entries = await db.select()
  .from(foodLog)
  .leftJoin(foods, eq(foodLog.foodId, foods.id))
  .where(and(
    eq(foodLog.userId, userId),
    eq(foodLog.date, date)
  ))
  .orderBy(asc(foodLog.timeHour));

// Insert
const [result] = await db.insert(foods)
  .values({ ...body, userId })
  .returning();

// Update
const [updated] = await db.update(foods)
  .set({ ...body, updatedAt: new Date() })
  .where(and(
    eq(foods.id, id),
    eq(foods.userId, userId)
  ))
  .returning();

// Upsert (INSERT...ON CONFLICT)
await db.insert(weightLog)
  .values(entry)
  .onConflictDoUpdate({
    target: [weightLog.userId, weightLog.date],
    set: { weight: entry.weight }
  });
```

### Validation Schema Pattern
```typescript
// Zod schemas with chaining
const foodCreateSchema = z.object({
  name: z.string().min(1).max(255),
  calories: z.number().min(0).max(99999).optional(),
  category: z.enum(['proteins', 'grains', ...]).default('other'),
});

// Partial for updates
const foodUpdateSchema = foodCreateSchema.partial();
```

---

## 5. File Organization

### Client
- **One component per file** — no barrel exports
- **Co-located styles** — CSS Module next to its component
- **Group by feature** — `components/dashboard/`, `components/log/`, etc.
- **Shared code** — `context/`, `hooks/`, `types/`, `styles/`
- **Views as pages** — `views/` contains one file per route

### Server
- **Route per resource** — `routes/user.ts`, `routes/foods.ts`, etc.
- **Service layer** — Business logic in `services/`, not in route handlers
- **Middleware** — Cross-cutting concerns in `middleware/`
- **Validation** — All schemas in `validation/schemas.ts`
- **Schema as code** — Database schema in `db/schema.ts`

---

## 6. Error Handling

### Client
| Layer | Mechanism |
|-------|-----------|
| Render errors | `ErrorBoundary` component wraps entire app |
| API errors | `apiFetch` throws; caught in component try/catch |
| User feedback | `useToast().toast(message, 'error')` |
| Empty data | `EmptyState` component with call-to-action |
| Loading | `Skeleton` components during fetch |

### Server
| Layer | Mechanism |
|-------|-----------|
| Input validation | `validate()` → AppError(400) |
| Not found | `throw new AppError(404, msg)` |
| Unhandled | `errorHandler` middleware → 500 |
| Import errors | Transaction rollback on failure |

---

## 7. Testing Conventions

### Client Tests
- Located next to source: `Component.test.tsx`
- Use React Testing Library (`render`, `screen`, `fireEvent`)
- Mock `useApi` for data dependencies
- Test user interactions, not implementation details

### Server Tests
- Located next to source: `module.test.ts`
- Use Vitest directly
- Pure functions (TDEE calculations) tested with data fixtures
- Route tests validate request/response contracts

### Test Naming
```typescript
describe('CalorieRing', () => {
  it('shows remaining calories when under target', () => { });
  it('shows over amount in rose color when exceeding target', () => { });
});
```

---

## 8. Git Conventions

### Branch Naming
- `main` — Production branch
- `feature/description` — New features
- `fix/description` — Bug fixes
- `perf/description` — Performance improvements
- `security/description` — Security fixes

### Commit Messages
Single-line summaries following conventional patterns:
```
Phase N: Description of phase deliverables
Fix description of what was fixed
Security Phase N: Description of security changes
Implement N fixes: brief list
```

---

## 9. Environment Configuration

### Client
No environment files needed. Vite proxy handles API routing in development.

### Server
```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/food_tracker

# Optional
PORT=3001                          # Server port (default: 3001)
CORS_ORIGIN=http://localhost:5173  # Allowed CORS origin
NODE_ENV=production                # Enable trust proxy
SESSION_SECRET=your-secret-here      # CSRF signing (32+ chars in prod)
COOKIE_SECURE=true                    # Secure cookie flag (true for HTTPS)
```

### Docker
Environment variables set in `.env.docker` (copied from `.env.docker.example`).
