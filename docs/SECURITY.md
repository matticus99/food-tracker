# Security — Fuel Food Tracker

This document covers the security model, threat landscape, implemented defenses, and remediation history.

---

## 1. Security Model

### Threat Context
Fuel is a **single-user, self-hosted** application. The primary deployment is localhost or a personal VPS behind a reverse proxy. This context shapes the threat model:

| Factor | Implication |
|--------|------------|
| Single user | No authentication needed by design |
| Self-hosted | Data stays on user's infrastructure |
| No third-party APIs | No external data flow |
| No user-generated public content | No XSS from other users |
| Network exposure (optional) | VPS deployment requires standard web security |

### Trust Boundaries

```
┌──────────────────────────────────────┐
│          Trusted Zone                │
│  ┌─────────┐  ┌───────┐  ┌──────┐  │
│  │ Browser │  │  API  │  │  DB  │  │
│  │ (User)  │──│Server │──│      │  │
│  └─────────┘  └───────┘  └──────┘  │
│                                      │
└──────────────┬───────────────────────┘
               │ Trust boundary
               ▼
┌──────────────────────────────────────┐
│        Untrusted Zone                │
│  - File uploads (.xlsx)              │
│  - Network requests (if exposed)     │
└──────────────────────────────────────┘
```

---

## 2. Defense Layers

### 2.1 HTTP Security Headers (Helmet)

**Implementation:** `helmet()` middleware in `server/src/index.ts`

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | Default | Prevents XSS and injection |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| Strict-Transport-Security | Enabled | Forces HTTPS |
| X-XSS-Protection | Enabled | Legacy XSS filter |
| Referrer-Policy | strict | Limits referrer leakage |

### 2.2 Rate Limiting

**Implementation:** `express-rate-limit` in `server/src/index.ts`

| Scope | Limit | Window |
|-------|-------|--------|
| All `/api/*` | 200 requests | 15 minutes |
| `/api/import/*` | 5 requests | 1 hour |

### 2.3 Input Validation (Zod)

**Implementation:** `server/src/validation/schemas.ts`

All route inputs are validated before processing:

| Schema | Validates |
|--------|-----------|
| `userUpdateSchema` | User profile updates (ranges, enums) |
| `foodCreateSchema` | Food creation (name length, macro ranges) |
| `foodUpdateSchema` | Food updates (partial, same rules) |
| `foodLogCreateSchema` | Log entries (UUID format, date format, hour range) |
| `foodLogUpdateSchema` | Log updates (partial) |
| `weightCreateSchema` | Weight entries (date format, weight range) |
| `daysQuerySchema` | Analytics period (1–365, coerced) |

**Validation behavior:**
- Rejects unknown fields (prevents mass assignment)
- Returns field-level error messages
- Coerces types where safe (query string numbers)

### 2.4 Request Body Limits

| Limit | Value | Scope |
|-------|-------|-------|
| JSON body | 16 KB | All routes |
| File upload | 10 MB | Import route only |
| Nginx body | 10 MB | Reverse proxy layer |

### 2.5 File Upload Security

**Implementation:** `server/src/routes/import.ts`

| Check | Description |
|-------|-------------|
| File type | Validates `.xlsx` extension |
| Magic bytes | Checks ZIP signature (`PK\x03\x04`) |
| Row limits | Max 5,000 rows per sheet |
| Library | ExcelJS (replaces vulnerable `xlsx`) |
| Transaction | Import wrapped in DB transaction |

### 2.6 SQL Injection Prevention

Drizzle ORM generates parameterized queries for all database operations. No raw SQL strings are used in application code.

**ILIKE Escaping:** Search queries escape special SQL characters (`%`, `_`, `\`) before passing to ILIKE:
```typescript
const escaped = search.replace(/[%_\\]/g, '\\$&');
```

### 2.7 CORS Policy

**Implementation:** `cors()` middleware with configurable origin:
```
CORS_ORIGIN=http://localhost:5173   # Development
CORS_ORIGIN=https://yourdomain.com  # Production
```

### 2.8 Error Masking

Production errors return generic messages. Stack traces and internal details are logged server-side only, never sent to clients.

---

## 3. Security Remediation History

The project underwent a comprehensive 5-phase security remediation. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the full audit report.

### Phase 1 — Quick Wins
**Commit:** `f5596b8`

| Fix | Before | After |
|-----|--------|-------|
| Mass assignment | `req.body` spread directly into DB | Explicit field allowlists |
| ILIKE injection | Raw search strings in SQL | Escaped special characters |
| Timezone bugs | Inconsistent date handling | UTC-normalized dates |
| Security headers | None | Helmet middleware added |

### Phase 2 — Input Validation
**Commit:** `48ed297`

| Fix | Before | After |
|-----|--------|-------|
| No validation | Trust all input | Zod schemas on all routes |
| File upload | No type checking | Magic byte + extension + size checks |
| Pagination | Unbounded queries | Limit (max 200) + offset |
| Negative values | Accepted | Min(0) on all numeric fields |

### Phase 3 — Dependencies & Data Integrity
**Commit:** `ce416c7`

| Fix | Before | After |
|-----|--------|-------|
| xlsx library | Prototype pollution + ReDoS (HIGH) | Replaced with ExcelJS |
| Import atomicity | Partial failures possible | Database transactions |
| Rate limiting | None | 200 req/15min, 5 req/hr import |
| Row limits | Unbounded | Max 5,000 rows per sheet |

### Phase 4 — Test Suite
**Commit:** `c9abecb`

Added comprehensive server-side tests covering:
- All route handlers (happy path + error cases)
- Input validation edge cases
- TDEE calculation accuracy
- Import parsing and error handling

### Phase 5 — Hardening
**Commit:** `ef56862`

| Fix | Description |
|-----|-------------|
| Request logging | Morgan middleware for audit trail |
| CSP | Content Security Policy headers |
| JSON limit | Explicit 16KB body limit |

---

## 4. Known Risks & Mitigations

### No Authentication
**Risk:** Anyone with network access can read/modify data.
**Mitigation:** Intended for localhost or VPS behind firewall/VPN. If exposed to the internet, place behind HTTP basic auth or a VPN.

### Single User Cache
**Risk:** Stale user data for up to 30 seconds after settings change.
**Mitigation:** Acceptable for single-user app. Cache invalidated on user update.

### File Uploads
**Risk:** Malicious .xlsx files could exploit parsing vulnerabilities.
**Mitigation:** Magic byte validation, row limits, ExcelJS (actively maintained), transaction rollback on failure.

### No CSRF Protection
**Risk:** Cross-site request forgery if accessed via browser.
**Mitigation:** CORS restricts origins. Single-user model limits impact. SameSite cookies not applicable (no sessions).

---

## 5. Security Checklist

| Category | Item | Status |
|----------|------|--------|
| Headers | Helmet security headers | Done |
| Input | Zod validation on all routes | Done |
| Input | Body size limits (16KB JSON, 10MB file) | Done |
| SQL | Parameterized queries (Drizzle ORM) | Done |
| SQL | ILIKE character escaping | Done |
| Files | Magic byte validation | Done |
| Files | Row count limits | Done |
| Files | Safe library (ExcelJS) | Done |
| Rate | API rate limiting (200/15min) | Done |
| Rate | Import rate limiting (5/hr) | Done |
| CORS | Configurable origin | Done |
| Errors | Generic error messages to client | Done |
| Logging | Request logging (Morgan) | Done |
| Data | Transaction-wrapped imports | Done |
| Data | Mass assignment prevention | Done |
| Auth | Authentication system | N/A (single-user) |
| Auth | CSRF tokens | N/A (no sessions) |

---

## 6. Recommendations for Internet Exposure

If deploying Fuel to a public-facing server:

1. **Add HTTP Basic Auth** at the Nginx level:
   ```nginx
   auth_basic "Restricted";
   auth_basic_user_file /etc/nginx/.htpasswd;
   ```

2. **Enable HTTPS** with Let's Encrypt / Certbot (see [DEPLOYMENT.md](DEPLOYMENT.md))

3. **Firewall** — Only allow ports 80/443:
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

4. **VPN** — Alternatively, access via WireGuard or Tailscale for zero-trust access

5. **Backups** — Regular database dumps:
   ```bash
   docker-compose exec db pg_dump -U postgres food_tracker > backup.sql
   ```
