> This project was built with the assistance of AI (Claude by Anthropic).

# Fuel — Food Tracker

A self-hosted food tracking PWA inspired by [MacroFactor](https://macrofactorapp.com/) with adaptive TDEE estimation, macro tracking, weight logging, and analytics.

Privacy-first, single-user, installable on mobile, with dark/light theme support.

![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Tests](https://img.shields.io/badge/Tests-334-green)

---

## Features

- **Dashboard** — Calorie ring, macro bars, TDEE vs intake chart, quick weight logging
- **Food Log** — Timeline view, add/edit food entries, swipe-to-delete
- **Food Database** — Personal food library with search, categories, full CRUD
- **Analytics** — TDEE trend, weight trend, average intake, actual vs goal, BMR breakdown
- **Settings** — Profile, macro targets, TDEE configuration, theme toggle, data import/export
- **Import/Export** — MacroFactor .xlsx import, CSV food import, full JSON data export/import
- **Adaptive TDEE** — Exponential Moving Average (EMA) algorithm for metabolic rate estimation
- **PWA** — Installable on mobile with offline support via Workbox

---

## Tech Stack

| Layer | Technology |
|------------|----------------------------------------------|
| Frontend   | React 18, Vite 6, TypeScript, CSS Modules    |
| Backend    | Express.js 4.21, PostgreSQL 16, Drizzle ORM  |
| Validation | Zod                                          |
| Security   | Helmet, CSRF (csrf-csrf), express-rate-limit  |
| Testing    | Vitest, React Testing Library (334 tests)     |
| PWA        | vite-plugin-pwa (Workbox)                     |
| Deployment | Docker, Nginx                                 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- npm

### Development

```bash
# Clone the repository
git clone https://github.com/matticus99/food-tracker.git
cd food-tracker

# Install dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..

# Set up the database
createdb food_tracker
cd server
cp .env.example .env  # Edit DATABASE_URL if needed
npm run db:push
npm run db:seed
cd ..

# Start dev servers (in separate terminals)
cd server && npm run dev
cd client && npm run dev
```

Dev server runs on **http://localhost:5173**, API on **http://localhost:3001**.

### Docker Deployment

```bash
cp .env.docker.example .env.docker
# Edit .env.docker with your settings
docker compose up -d --build
```

App runs on **http://localhost**. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production and SSL setup.

---

## Project Structure

```
client/                React frontend
  src/components/        UI components (layout, dashboard, log, foods, analytics, settings)
  src/views/             Page components
  src/context/           Theme, Date contexts
  src/hooks/             useApi data fetching
server/                Express backend
  src/routes/            API route handlers
  src/services/          Business logic (TDEE, import, export)
  src/db/                Schema, connection, seed
  src/middleware/         User cache, error handling
  src/validation/        Zod schemas
docs/                  Documentation
nginx/                 Reverse proxy config
```

---

## Scripts

### Client (`client/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

### Server (`server/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled production server |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with defaults |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

- [API Reference](docs/API_REFERENCE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Coding Standards](docs/CODING_STANDARDS.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Frontend Guide](docs/FRONTEND_GUIDE.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Performance Fixes](docs/PERFORMANCE_FIXES.md)
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Security](docs/SECURITY.md)

---

## Contributing

This is a personal project. You're welcome to fork it and make it your own, but pull requests are not accepted and will be automatically closed.

---

## License

This project is licensed under the [MIT License](LICENSE).
