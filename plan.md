# Fix MacroFactor Import — 500 Error & Response Key Mismatch

## Context

The MacroFactor XLSX import (`POST /api/import/macrofactor`) returns a 500 error. Investigation found two confirmed bugs and a likely 500 root cause:

1. **Response key mismatch** — Backend returns `{ intakeDays, weightDays, ... }` but frontend expects `{ dailyIntakeCount, weightLogCount, ... }`. Even when import succeeds, the UI shows "undefined" for all counts.
2. **Error response key mismatch** — Backend error handler returns `{ error: "..." }` but frontend reads `body.message`, so real error messages are swallowed and users only see generic "Upload failed (500)".
3. **Likely 500 cause** — Database constraint violations (e.g. unique index on `daily_intake(user_id, date)`) during import throw raw PostgreSQL errors, which aren't `AppError` instances, so the error handler returns a generic 500.

## Files to Modify

### 1. `server/src/services/macrofactorImport.ts`

Rename `ImportSummary` fields to match frontend expectations:

```
intakeDays     → dailyIntakeCount
weightDays     → weightLogCount
tdeeDays       → tdeeHistoryCount
favoriteFoods  → favoriteFoodsCount
historyFoods   → historyFoodsCount
```

Wrap the transaction body in a try/catch that converts database errors into descriptive `AppError(500, ...)` messages, so the error handler returns useful information instead of "Internal server error".

### 2. `client/src/components/settings/ImportSection.tsx`

Fix error response parsing — read `body.error` instead of `body.message` to match the backend error handler format:

```typescript
// Before:
throw new Error(body.message || `Upload failed (${res.status})`);
// After:
throw new Error(body.error || body.message || `Upload failed (${res.status})`);
```

### 3. `server/src/middleware/errorHandler.ts`

Add the `message` field alongside `error` in the error response for consistency:

```typescript
res.status(err.statusCode).json({ error: err.message, message: err.message });
```

And for the 500 fallback, log the full error (not just `err.message`) so the actual cause is diagnosable:

```typescript
console.error('[Error]', err);
```

## Verification

1. Start the dev server and backend
2. Navigate to Settings → Import section
3. Upload a MacroFactor `.xlsx` file
4. Confirm no 500 error occurs
5. Confirm the "Import Complete" UI shows actual counts (not "undefined")
6. Re-import the same file — confirm it succeeds with skipped counts (no duplicate constraint errors)
7. Run existing tests: `cd server && npm test`
