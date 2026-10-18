import request from 'supertest';
import { describe, it, expect, afterEach } from 'vitest';
import app from '../src/app.js';

describe('hosting preparation: security headers', () => {
  it('includes standard security headers like x-content-type-options', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers).toHaveProperty('x-frame-options');
  });
});

describe('hosting preparation: CORS origin matching', () => {
  const originalWebUrl = process.env.WEB_URL;

  afterEach(() => {
    if (originalWebUrl !== undefined) {
      process.env.WEB_URL = originalWebUrl;
    } else {
      delete process.env.WEB_URL;
    }
  });

  it('accepts requests from configured WEB_URL origin', async () => {
    process.env.WEB_URL = 'https://mrbrown098.github.io';
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://mrbrown098.github.io');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://mrbrown098.github.io');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('matches WEB_URL even if WEB_URL has a trailing slash', async () => {
    process.env.WEB_URL = 'https://mrbrown098.github.io/';
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://mrbrown098.github.io');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://mrbrown098.github.io');
  });

  it('does not set access-control-allow-origin for unknown origin', async () => {
    process.env.WEB_URL = 'https://mrbrown098.github.io';
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://attacker.example.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows requests with no Origin header (e.g. curl or mobile apps)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('hosting preparation: auth rate limiting', () => {
  const originalEnable = process.env.ENABLE_AUTH_RATE_LIMIT_TEST;
  const originalMax = process.env.AUTH_RATE_LIMIT_MAX;

  afterEach(() => {
    if (originalEnable !== undefined) {
      process.env.ENABLE_AUTH_RATE_LIMIT_TEST = originalEnable;
    } else {
      delete process.env.ENABLE_AUTH_RATE_LIMIT_TEST;
    }
    if (originalMax !== undefined) {
      process.env.AUTH_RATE_LIMIT_MAX = originalMax;
    } else {
      delete process.env.AUTH_RATE_LIMIT_MAX;
    }
  });

  it('returns 429 with JSON error message once limit is reached when enabled', async () => {
    process.env.ENABLE_AUTH_RATE_LIMIT_TEST = 'true';
    process.env.AUTH_RATE_LIMIT_MAX = '2';

    const testIp = '198.51.100.42';

    const req1 = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', testIp)
      .send({});
    expect(req1.status).toBe(400);

    const req2 = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', testIp)
      .send({});
    expect(req2.status).toBe(400);

    const req3 = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', testIp)
      .send({});
    expect(req3.status).toBe(429);
    expect(req3.body).toEqual({
      success: false,
      message: 'Too many attempts, please try again later.'
    });
  });
});
