import request from 'supertest';
import { describe, it, expect } from 'vitest';
import handler from '../api/index.js';
import { useTestDatabase } from './helpers/db.js';

useTestDatabase();

describe('vercel entry point', () => {
  it('answers the health check', async () => {
    const res = await request(handler).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('passes API requests through to the app', async () => {
    const res = await request(handler).get('/api/quiz/questions');

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(10);
  });

  it('keeps the 404 response for unknown routes', async () => {
    const res = await request(handler).get('/api/does-not-exist');

    expect(res.status).toBe(404);
  });
});
