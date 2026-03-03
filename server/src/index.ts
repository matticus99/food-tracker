import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import userRoutes from './routes/user.js';
import foodsRoutes from './routes/foods.js';
import foodLogRoutes from './routes/foodLog.js';
import weightRoutes from './routes/weight.js';
import analyticsRoutes from './routes/analytics.js';
import importRoutes from './routes/import.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ── Middleware ──
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

// ── Rate limiting ──
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const importLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Too many import requests, try again later' } });
app.use('/api', apiLimiter);
app.use('/api/import', importLimiter);

// ── Routes ──
app.use('/api/user', userRoutes);
app.use('/api/foods', foodsRoutes);
app.use('/api/log', foodLogRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/import', importRoutes);

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handling ──
app.use(errorHandler);

// ── Start ──
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
