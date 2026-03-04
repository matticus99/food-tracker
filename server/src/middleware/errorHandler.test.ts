import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError, errorHandler } from './errorHandler.js';
import type { Request, Response, NextFunction } from 'express';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── AppError ─────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('extends Error', () => {
    const err = new AppError(400, 'Bad request');
    expect(err).toBeInstanceOf(Error);
  });

  it('stores statusCode', () => {
    const err = new AppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
  });

  it('stores message', () => {
    const err = new AppError(422, 'Validation failed');
    expect(err.message).toBe('Validation failed');
  });

  it('has name set to AppError', () => {
    const err = new AppError(500, 'Internal error');
    expect(err.name).toBe('AppError');
  });

  it('supports various status codes', () => {
    expect(new AppError(400, 'Bad').statusCode).toBe(400);
    expect(new AppError(401, 'Unauthorized').statusCode).toBe(401);
    expect(new AppError(403, 'Forbidden').statusCode).toBe(403);
    expect(new AppError(404, 'Not found').statusCode).toBe(404);
    expect(new AppError(409, 'Conflict').statusCode).toBe(409);
    expect(new AppError(422, 'Unprocessable').statusCode).toBe(422);
    expect(new AppError(500, 'Internal').statusCode).toBe(500);
  });
});

// ── errorHandler middleware ─────────────────────────────────────────────────

describe('errorHandler', () => {
  it('responds with statusCode and error message for AppError', () => {
    const err = new AppError(404, 'Resource not found');
    const res = mockResponse();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Resource not found' });
  });

  it('responds with 500 for generic errors', () => {
    const err = new Error('Something unexpected');
    const res = mockResponse();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('logs error message to console', () => {
    const err = new AppError(400, 'Bad input');
    const res = mockResponse();

    errorHandler(err, mockReq, res, mockNext);

    expect(console.error).toHaveBeenCalledWith('[AppError]', 400, 'Bad input');
  });

  it('uses correct status code for various AppErrors', () => {
    const res1 = mockResponse();
    errorHandler(new AppError(400, 'Bad'), mockReq, res1, mockNext);
    expect(res1.status).toHaveBeenCalledWith(400);

    const res2 = mockResponse();
    errorHandler(new AppError(422, 'Invalid'), mockReq, res2, mockNext);
    expect(res2.status).toHaveBeenCalledWith(422);

    const res3 = mockResponse();
    errorHandler(new AppError(403, 'Forbidden'), mockReq, res3, mockNext);
    expect(res3.status).toHaveBeenCalledWith(403);
  });

  it('does not expose internal error message to client for generic errors', () => {
    const err = new Error('DB connection pool exhausted');
    const res = mockResponse();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    // The actual error message should NOT appear in the response
    expect(res.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ error: 'DB connection pool exhausted' }),
    );
  });

  it('handles TypeError (generic error) with 500 status', () => {
    const err = new TypeError('Cannot read property of undefined');
    const res = mockResponse();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
