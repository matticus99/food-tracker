# Project Overview — Fuel Food Tracker

## 1. Introduction

**Fuel** is a custom food tracking Progressive Web App (PWA) inspired by MacroFactor. It provides daily macro tracking, weight logging, adaptive TDEE estimation, and analytics — all in a self-hosted, privacy-first package.

**Project Name:** Fuel — Food Tracker
**Repository Branch:** `main`
**Current Status:** Feature-complete (Phases 1–9), tested, security-hardened, Docker-deployable

---

## 2. Vision & Goals

### Problem Statement
Existing food tracking apps are either subscription-based, ad-supported, or lack adaptive TDEE features. Users who want full control over their nutrition data have limited self-hosted options.

### Goals
- Provide a MacroFactor-like experience as a self-hosted PWA
- Adaptive TDEE calculation using Exponential Moving Average (EMA)
- Import existing MacroFactor data for continuity
- Mobile-first responsive design with dark/light theme support
- Zero external dependencies for data — all data stays on the user's server

### Non-Goals
- Multi-user/social features (single-user by design)
- Barcode scanning or external food database APIs
- Meal planning or recipe management
- Calorie burn tracking from exercise devices

---

## 3. Requirements

### Functional Requirements

| ID | Category | Requirement | Phase |
|----|----------|-------------|-------|
| FR-01 | Dashboard | View daily calorie ring with consumed vs target | 3 |
| FR-02 | Dashboard | View macro breakdown (protein, fat, carbs) with progress bars | 3 |
| FR-03 | Dashboard | Navigate between days and view weekly strip | 3 |
| FR-04 | Dashboard | View 7-day TDEE vs intake trend chart | 3 |
| FR-05 | Food Log | Log food entries with time-of-day and servings | 4 |
| FR-06 | Food Log | Delete food entries (swipe on mobile, button on desktop) | 4 |
| FR-07 | Food Log | View timeline of meals grouped by hour | 4 |
| FR-08 | Foods DB | Create, edit, delete custom foods with macros | 5 |
| FR-09 | Foods DB | Search and filter by category | 5 |
| FR-10 | Analytics | View TDEE trend with configurable period (7/14/30 days) | 6 |
| FR-11 | Analytics | View smoothed weight trend | 6 |
| FR-12 | Analytics | View average intake vs calorie target | 6 |
| FR-13 | Analytics | View actual vs goal comparison chart | 6 |
| FR-14 | Analytics | View BMR breakdown (BMR, activity multiplier, est. TDEE, target) | 6 |
| FR-15 | Settings | Configure profile (age, sex, height, weight) | 7 |
| FR-16 | Settings | Set macro targets (calories, protein, fat, carbs) | 7 |
| FR-17 | Settings | Configure TDEE parameters (activity level, smoothing factor) | 7 |
| FR-18 | Settings | Toggle dark/light theme | 7 |
| FR-19 | Import | Import MacroFactor .xlsx exports (macros, weight, TDEE, foods) | 7 |
| FR-20 | Weight | Log daily weight with modal | 8 |
| FR-21 | Weight | Auto-recalculate TDEE on weight entry | 8 |
| FR-22 | PWA | Installable as standalone mobile app | 9 |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Page load time | < 2 seconds on 3G |
| NFR-02 | Lighthouse PWA score | > 90 |
| NFR-03 | Mobile responsiveness | Full support at 375px+ |
| NFR-04 | Theme switching | Instant, no flash |
| NFR-05 | API response time | < 200ms for standard queries |
| NFR-06 | Docker deployment | Single `docker-compose up` |
| NFR-07 | Data privacy | All data stored locally, no third-party services |

---

## 4. Implementation Plan Summary

The project was implemented in 9 phases plus additional security, performance, and deployment work.

### Phase 1 — Scaffolding & Design System
- Vite + React + TypeScript project setup
- CSS custom properties (design tokens)
- Theme context with dark/light support
- App shell with sidebar and bottom navigation
- Google Fonts (Sora, Outfit)

### Phase 2 — Backend & Database
- Express.js server with PostgreSQL
- Drizzle ORM schema (6 tables, 5 enums)
- RESTful API endpoints for all resources
- Seed data (default user + 22 foods)
- Error handling middleware

### Phase 3 — Dashboard View
- Calorie ring (animated SVG)
- Macro card with progress bars
- Day navigator and week strip
- TDEE vs intake trend chart
- Weight logging modal

### Phase 4 — Food Log View
- Timeline component grouped by hour
- Food entry with swipe-to-delete
- Add food modal with search and servings
- Log summary badges

### Phase 5 — My Foods Database
- Food CRUD with emoji picker
- Search bar and category tabs
- Food list with macro columns
- "Needs macros" badge for imports

### Phase 6 — Analytics View
- TDEE trend card with sparkline
- Smoothed weight trend card
- Average intake bar chart
- Actual vs goal comparison
- BMR breakdown card

### Phase 7 — Settings & Import
- Profile, goal, and macro settings groups
- Activity level and TDEE smoothing controls
- MacroFactor .xlsx import with summary
- Theme selector

### Phase 8 — Weight Logging & TDEE
- Weight entry with upsert logic
- Background TDEE recalculation on weight change
- Mifflin-St Jeor BMR calculation
- EMA smoothing for weight trend

### Phase 9 — Polish & PWA
- PWA manifest and service worker
- Loading skeletons
- Error boundaries
- Toast notifications
- Empty states

### Post-Phase Work
- **Testing:** 334 tests (274 client, 60 server)
- **Security:** 5-phase remediation (Zod validation, helmet, rate limiting, exceljs migration)
- **Performance:** 6 optimizations (indexes, caching, consolidated endpoints, batch upsert)
- **Docker:** Multi-stage build with nginx reverse proxy

---

## 5. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.3 |
| Build Tool | Vite | 6.0 |
| Language | TypeScript | 5.6–5.7 |
| Routing | React Router | 6.28 |
| Styling | CSS Modules + CSS Custom Properties | — |
| PWA | vite-plugin-pwa | 0.21 |
| Backend | Express.js | 4.21 |
| Database | PostgreSQL | 16 |
| ORM | Drizzle ORM | 0.39 |
| Validation | Zod | 4.3 |
| File Parsing | ExcelJS | 4.4 |
| Security | Helmet + express-rate-limit | 8.1 / 8.2 |
| Testing | Vitest + React Testing Library | 4.0 / 16.3 |
| Deployment | Docker + Nginx | — |

---

## 6. User Personas

### Primary User
- Health-conscious individual tracking macros for body composition goals
- Previously used MacroFactor or similar app
- Comfortable self-hosting (has a VPS or home server)
- Values data privacy and ownership
- Uses both mobile and desktop

---

## 7. Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| All 9 phases implemented | Yes | Complete |
| Test coverage (334 tests) | Passing | Complete |
| Security audit findings resolved | All HIGH/MEDIUM | Complete |
| Docker deployment working | Single command | Complete |
| Performance optimizations | 6 fixes applied | Complete |
| PWA installable | Standalone mode | Complete |

---

## 8. Related Documents

| Document | Description |
|----------|-------------|
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Detailed 9-phase implementation plan |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and design decisions |
| [API_REFERENCE.md](API_REFERENCE.md) | Complete REST API documentation |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Database tables, indexes, and relationships |
| [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) | React components and UI documentation |
| [CODING_STANDARDS.md](CODING_STANDARDS.md) | Code conventions and patterns |
| [SECURITY.md](SECURITY.md) | Security model and remediation history |
| [DEFECT_LOG.md](DEFECT_LOG.md) | Bug fixes and change history |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Docker deployment and operations |
| [PERFORMANCE_FIXES.md](PERFORMANCE_FIXES.md) | Performance optimization details |
