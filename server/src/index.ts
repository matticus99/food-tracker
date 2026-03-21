import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import userRoutes from './routes/user.js';
import foodsRoutes from './routes/foods.js';
import foodLogRoutes from './routes/foodLog.js';
import weightRoutes from './routes/weight.js';
import analyticsRoutes from './routes/analytics.js';
import importRoutes from './routes/import.js';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler } from './middleware/errorHandler.js';
import { userMiddleware } from './middleware/userMiddleware.js';
import { queryClient } from './db/connection.js';

// ── Environment validation ──
const SESSION_SECRET = process.env.SESSION_SECRET ?? '';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const required = ['DATABASE_URL', 'SESSION_SECRET', 'CORS_ORIGIN'] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (SESSION_SECRET.length < 32 || SESSION_SECRET.includes('change-in-production')) {
    console.error('FATAL: SESSION_SECRET must be at least 32 characters and not the default value.');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
  }
}

// Use a stable secret for dev, validated secret for prod
const csrfSecret = SESSION_SECRET || crypto.randomBytes(32).toString('hex');


const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Trust first proxy (nginx) so express-rate-limit sees real client IPs
if (isProduction) {
  app.set('trust proxy', 1);
}

// ── CSRF Protection (double-submit cookie pattern) ──
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: () => '',   // stateless double-submit; session binding added with auth
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

// ── Middleware ──
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ['https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  } : false,
}));
// Permissions-Policy header (Helmet doesn't support this natively)
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use(morgan('short'));

// ── Rate limiting (keyed by userId after userMiddleware, falls back to IP) ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? '127.0.0.1'),
});
const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many import requests, try again later' },
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? '127.0.0.1'),
});
app.use('/api', apiLimiter);
app.post('/api/import/*', importLimiter);

// ── Request timeout (30s) ──
app.use((_req, res, next) => {
  res.setTimeout(30_000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

// ── User middleware (caches userId for all /api routes) ──
app.use('/api', userMiddleware);

// ── CSRF token endpoint (GET = exempt from CSRF check) ──
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ token });
});

// ── CSRF protection for all state-changing API requests ──
app.use('/api', (req, res, next) => {
  // Skip CSRF for GET/HEAD/OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  doubleCsrfProtection(req, res, next);
});

// ── Routes ──
app.use('/api/user', userRoutes);
app.use('/api/foods', foodsRoutes);
app.use('/api/log', foodLogRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handling ──
app.use(errorHandler);

// ── Start ──
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Keep-alive timing: must exceed nginx upstream keepalive_timeout (default 60s)
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// ── Graceful shutdown ──
function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    queryClient.end({ timeout: 5 })
      .then(() => {
        console.log('Database connections closed.');
        process.exit(0);
      })
      .catch(() => process.exit(1));
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
