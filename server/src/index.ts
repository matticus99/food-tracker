import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

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
