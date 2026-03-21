# API Reference — Fuel Food Tracker

**Base URL:** `/api`
**Content-Type:** `application/json`
**Rate Limits:** 200 requests/15 minutes (API), 5 requests/hour (import)

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [CSRF](#2-csrf)
3. [User](#3-user)
4. [Foods](#4-foods)
5. [Food Log](#5-food-log)
6. [Weight](#6-weight)
7. [Dashboard](#7-dashboard)
8. [Analytics](#8-analytics)
9. [Import](#9-import)
10. [Error Responses](#10-error-responses)

---

## 1. Health Check

### `GET /api/health`

Returns server status.

**Response:** `200 OK`
```json
{
  "status": "ok"
}
```

---

## 2. CSRF

### `GET /api/csrf-token`

Returns a CSRF token. The token is also set as an httpOnly cookie.

**Response:** `200 OK`
```json
{
  "csrfToken": "string"
}
```

**Notes:**
- Token must be sent as `x-csrf-token` header on POST/PUT/DELETE/PATCH requests
- The `useApi` hook manages this automatically

---

## 3. User

### `GET /api/user`

Returns the user profile.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "age": 30,
  "sex": "male",
  "heightInches": "70",
  "currentWeight": "180",
  "objective": "maintain",
  "activityLevel": "1.25",
  "calorieTarget": 2200,
  "proteinTarget": 180,
  "fatTarget": 70,
  "carbTarget": 240,
  "tdeeSmoothingFactor": "0.100",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### `PUT /api/user`

Update user settings. All fields optional.

**Request Body:**
| Field | Type | Validation |
|-------|------|------------|
| `age` | integer | 1–150 |
| `sex` | string | `"male"` or `"female"` |
| `heightInches` | number | > 0, max 120 |
| `currentWeight` | number | > 0, max 1500 |
| `objective` | string | `"cut"`, `"maintain"`, `"bulk"` |
| `activityLevel` | number | 1–3 |
| `calorieTarget` | integer | 0–50000 |
| `proteinTarget` | integer | 0–5000 |
| `fatTarget` | integer | 0–5000 |
| `carbTarget` | integer | 0–5000 |
| `tdeeSmoothingFactor` | number | 0.01–1 |

**Response:** `200 OK` — Updated user object

---

## 4. Foods

### `GET /api/foods`

List user's foods with optional filtering and pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | `"all"` | Filter by category enum |
| `search` | string | — | Case-insensitive name search |
| `limit` | integer | 50 | Results per page (max 200) |
| `offset` | integer | 0 | Pagination offset |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Chicken Breast",
    "emoji": "🍗",
    "category": "proteins",
    "servingLabel": "per 100g",
    "servingGrams": "100",
    "calories": "165",
    "protein": "31",
    "fat": "3.6",
    "carbs": "0",
    "source": "manual",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
]
```

### `POST /api/foods`

Create a new food.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 1–255 characters |
| `emoji` | string | No | Max 10 characters |
| `category` | string | No | Category enum (default: `"favorites"`) |
| `servingLabel` | string | No | Max 100 characters |
| `servingGrams` | number | No | 0–99999 |
| `calories` | number | No | 0–99999 |
| `protein` | number | No | 0–99999 |
| `fat` | number | No | 0–99999 |
| `carbs` | number | No | 0–99999 |

**Response:** `201 Created` — Created food object

### `PUT /api/foods/:id`

Update a food. All fields optional (same as create body).

**Response:** `200 OK` — Updated food object

### `DELETE /api/foods/:id`

Delete a food.

**Response:** `200 OK`
```json
{ "deleted": true }
```

### Category Enum Values
`favorites`, `proteins`, `grains`, `vegetables`, `fruits`, `dairy`, `snacks`, `drinks`, `daily`

### `GET /api/foods/counts`

Get food counts per category, with optional search filter.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Optional search filter |

**Response:** `200 OK`
```json
{
  "proteins": 5,
  "grains": 3,
  "favorites": 2
}
```

### Food Source Enum
`manual`, `imported_favorite`, `imported_history`

---

## 5. Food Log

### `GET /api/log`

Get food log entries for a specific date.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | Yes | `YYYY-MM-DD` format |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "foodId": "uuid",
    "date": "2024-01-15",
    "timeHour": 12,
    "servings": "1.50",
    "createdAt": "2024-01-15T12:30:00.000Z",
    "updatedAt": "2024-01-15T12:30:00.000Z",
    "food": {
      "id": "uuid",
      "name": "Chicken Breast",
      "emoji": "🍗",
      "category": "proteins",
      "servingLabel": "per 100g",
      "calories": "165",
      "protein": "31",
      "fat": "3.6",
      "carbs": "0"
    }
  }
]
```

Results sorted by `timeHour ASC`, then `createdAt ASC`.

### `POST /api/log`

Log a food entry.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `foodId` | string | Yes | Valid UUID |
| `date` | string | Yes | `YYYY-MM-DD` format |
| `timeHour` | integer | Yes | 0–23 |
| `servings` | number | No | > 0, max 100 (default: 1) |

**Response:** `201 Created` — Created log entry

### `PUT /api/log/:id`

Update a log entry.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `servings` | number | No | > 0, max 100 |
| `timeHour` | integer | No | 0–23 |
| `date` | string | No | `YYYY-MM-DD` |

**Response:** `200 OK` — Updated entry

### `POST /api/log/batch`

Create multiple food log entries at once.

**Request Body:**
```json
{
  "entries": [
    {
      "foodId": "uuid",
      "date": "YYYY-MM-DD",
      "timeHour": 12,
      "servings": 1
    }
  ]
}
```

**Response:** `201 Created` — Array of created entries

### `DELETE /api/log/:id`

Delete a log entry.

**Response:** `200 OK`
```json
{ "deleted": true }
```

---

## 6. Weight

### `GET /api/weight`

Get weight log entries with optional date range.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | No | Start date `YYYY-MM-DD` |
| `to` | string | No | End date `YYYY-MM-DD` |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "date": "2024-01-15",
    "weight": "175.5",
    "createdAt": "2024-01-15T08:00:00.000Z"
  }
]
```

### `POST /api/weight`

Log weight for a date. Upserts if entry exists for that date.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | string | Yes | `YYYY-MM-DD` |
| `weight` | number | Yes | > 0, max 1500 |

**Side Effects:**
- Updates `users.currentWeight`
- Triggers background TDEE recalculation (last 90 days)

**Response:** `201 Created` — Created/updated weight entry

### `PUT /api/weight/:id`

Update a specific weight entry.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `weight` | number | Yes | > 0, max 1500 |

**Side Effects:**
- Triggers background TDEE recalculation

**Response:** `200 OK` — Updated weight entry

---

## 7. Dashboard

### `GET /api/dashboard`

Consolidated endpoint returning all data needed for the dashboard view.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `date` | string | today | `YYYY-MM-DD` format |

**Response:** `200 OK`
```json
{
  "log": [ /* Food log entries with food details (same as GET /api/log) */ ],
  "user": { /* Full user object */ },
  "todayWeight": [ /* Weight entry for the date, or empty array */ ],
  "tdee": [
    {
      "date": "2024-01-15",
      "tdeeEstimate": "2400.0",
      "caloriesConsumed": "2350.0",
      "weightUsed": "175.5"
    }
  ],
  "intake": [
    {
      "date": "2024-01-15",
      "calories": "2350.0",
      "protein": "180.0",
      "fat": "70.0",
      "carbs": "240.0",
      "source": "logged"
    }
  ]
}
```

**Notes:**
- `tdee` contains last 7 days of TDEE history
- `intake` contains last 7 days of daily intake
- Replaces 4–5 separate API calls

---

## 8. Analytics

### `GET /api/analytics/summary`

Consolidated endpoint returning all analytics data.

**Query Parameters:**
| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `days` | integer | 30 | 1–365 |

**Response:** `200 OK`
```json
{
  "tdee": [
    {
      "date": "2024-01-15",
      "tdeeEstimate": 2400,
      "caloriesConsumed": 2350,
      "weightUsed": 175.5
    }
  ],
  "weightTrend": [
    {
      "date": "2024-01-15",
      "weight": 175.5,
      "trend": 175.2
    }
  ],
  "dailyIntake": [
    {
      "date": "2024-01-15",
      "calories": 2350,
      "protein": 180,
      "fat": 70,
      "carbs": 240,
      "source": "logged"
    }
  ],
  "bmr": {
    "bmr": 1680,
    "activityLevel": 1.25,
    "estimatedTdee": 2100,
    "calorieTarget": 2200
  },
  "goals": {
    "calorieTarget": 2200,
    "proteinTarget": 180,
    "fatTarget": 70,
    "carbTarget": 240
  }
}
```

### `GET /api/analytics/tdee`

TDEE history with EMA smoothing.

**Query:** `days` (default 14, max 365)

**Response:** `200 OK` — Array of `{ date, tdeeEstimate, caloriesConsumed, weightUsed }`

### `GET /api/analytics/weight-trend`

Smoothed weight trend using EMA.

**Query:** `days` (default 14, max 365)

**Response:** `200 OK` — Array of `{ date, weight, trend }`

### `GET /api/analytics/daily-intake`

Daily macro totals.

**Query:** `days` (default 7, max 365)

**Response:** `200 OK` — Array of `{ date, calories, protein, fat, carbs }`

### `GET /api/analytics/actual-vs-goal`

Actual intake vs calorie target comparison.

**Query:** `days` (default 7, max 365)

**Response:** `200 OK`
```json
[
  {
    "date": "2024-01-15",
    "actual": 2350,
    "goal": 2200,
    "diff": 150
  }
]
```

### `GET /api/analytics/bmr`

BMR and TDEE estimate from user profile.

**Response:** `200 OK`
```json
{
  "bmr": 1680,
  "activityLevel": 1.25,
  "estimatedTdee": 2100,
  "calorieTarget": 2200
}
```

---

## 9. Import

### `POST /api/import/macrofactor`

Upload a MacroFactor .xlsx export file.

**Rate Limit:** 5 requests/hour

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | file | `.xlsx` file (max 10MB) |

**Supported Sheets:**
| Sheet Name | Imported To | Data |
|------------|-------------|------|
| Calories & Macros | `dailyIntake` | Date, calories, protein, fat, carbs |
| Scale Weight | `weightLog` | Date, weight |
| Expenditure | `tdeeHistory` | Date, TDEE estimate |
| Weight Trend | `tdeeHistory` | Trend weight for TDEE records |
| Favorites | `foods` | Name, emoji, macros (source: `imported_favorite`) |
| History | `foods` | Name only (source: `imported_history`) |

**Response:** `200 OK`
```json
{
  "success": true,
  "summary": {
    "intakeDays": 90,
    "weightDays": 45,
    "tdeeDays": 45,
    "favoriteFoods": 23,
    "historyFoods": 87,
    "skipped": {
      "intake": 0,
      "weight": 5,
      "tdee": 0,
      "foods": 12
    }
  }
}
```

**Validation:**
- File must be `.xlsx` format (ZIP magic byte check)
- Max 5000 rows per sheet
- Duplicate dates/names are skipped (not overwritten)
- Entire import runs in a database transaction

### `POST /api/import/csv`

Upload a CSV file to bulk import foods.

**Rate Limit:** 5 requests/hour

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | file | `.csv` file |

**Response:** `200 OK` with import summary

### `GET /api/import/export`

Export all user data as JSON with integrity checksum.

**Response:** `200 OK` — JSON file download

### `POST /api/import/restore`

Restore user data from a JSON export file.

**Rate Limit:** 5 requests/hour

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | file | JSON export file |

**Response:** `200 OK` with restore summary

### `GET /api/import/status`

Check if user has imported data.

**Response:** `200 OK`
```json
{
  "hasImportedData": true
}
```

---

## 10. Error Responses

All errors return JSON with an `error` field.

### Validation Error (400)
```json
{
  "error": "name: Required; calories: Expected number, received string"
}
```

### Not Found (404)
```json
{
  "error": "Food not found"
}
```

### Rate Limited (429)
```json
{
  "error": "Too many requests, please try again later."
}
```

### Server Error (500)
```json
{
  "error": "Internal server error"
}
```

### Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad Request — Invalid input or validation failure |
| 404 | Not Found — Resource does not exist |
| 413 | Payload Too Large — Body exceeds 16KB or file exceeds 10MB |
| 429 | Too Many Requests — Rate limit exceeded |
| 500 | Internal Server Error |
