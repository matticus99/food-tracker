import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { AppError } from './errorHandler.js';

interface CachedUser {
  id: string;
  age: number | null;
  sex: 'male' | 'female' | null;
  heightInches: string | null;
  currentWeight: string | null;
  objective: 'cut' | 'maintain' | 'bulk' | null;
  activityLevel: string | null;
  calorieTarget: number | null;
  goalPace: number | null;
  proteinTarget: number | null;
  fatTarget: number | null;
  carbTarget: number | null;
  tdeeSmoothingFactor: string | null;
}

declare global {
  namespace Express {
    interface Request {
      userId: string;
      user: CachedUser;
    }
  }
}

let cachedUser: CachedUser | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export function invalidateUserCache() {
  cachedUser = null;
  cacheTimestamp = 0;
}

export async function userMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const now = Date.now();
    if (cachedUser && now - cacheTimestamp < CACHE_TTL_MS) {
      req.userId = cachedUser.id;
      req.user = cachedUser;
      return next();
    }

    const [user] = await db.select().from(users).limit(1);
    if (!user) throw new AppError(404, 'No user found');

    cachedUser = user as CachedUser;
    cacheTimestamp = now;
    req.userId = cachedUser.id;
    req.user = cachedUser;
    next();
  } catch (err) {
    next(err);
  }
}
