// Tests that need no database: health checks, route protection, and token claims.
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import { generateToken, verifyToken } from '../src/config/jwt.js';

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

describe('health endpoints', () => {
  it('GET /health returns 200 and a healthy status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET / returns 200 and reports the API as online', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
  });

  it('returns a JSON 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('protected routes reject bad credentials', () => {
  it('GET /api/auth/profile returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/profile');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_TOKEN');
  });

  it('GET /api/auth/profile returns 401 with a garbage token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('GET /api/auth/profile returns 401 for a token signed with a different secret', async () => {
    // Header.payload.signature for {"userId":"x"} signed with another secret
    const forged =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ4In0.' +
      'c2lnbmF0dXJlLWZyb20tYW5vdGhlci1zZWNyZXQ';

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });
});

describe('token claims', () => {
  it('uses second-based iat/exp, with exp seven days after iat', () => {
    const decoded = verifyToken(generateToken('user-1', 'a@example.com'));
    const nowInSeconds = Date.now() / 1000;

    expect(decoded.exp - decoded.iat).toBe(SEVEN_DAYS_IN_SECONDS);
    // A millisecond iat (the old bug) would be ~1000x larger than this
    expect(Math.abs(decoded.iat - nowInSeconds)).toBeLessThan(10);
  });

  it('carries the user id and email', () => {
    const decoded = verifyToken(generateToken('user-1', 'a@example.com'));

    expect(decoded.userId).toBe('user-1');
    expect(decoded.email).toBe('a@example.com');
  });
});
