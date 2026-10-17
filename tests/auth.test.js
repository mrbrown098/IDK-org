// Auth tests that exercise the database (register, login, profile, isolation).
// By default they run against an in-memory MongoDB; see tests/helpers/db.js.
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import { verifyToken } from '../src/config/jwt.js';
import { useTestDatabase } from './helpers/db.js';

useTestDatabase();

const PASSWORD = 'SecurePass123!';

const newUser = (overrides = {}) => ({
  name: 'Test User',
  email: 'test@example.com',
  password: PASSWORD,
  confirmPassword: PASSWORD,
  ...overrides
});

const register = (overrides = {}) =>
  request(app).post('/api/auth/register').send(newUser(overrides));

const login = (body) => request(app).post('/api/auth/login').send(body);

const getProfile = (token) =>
  request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);

describe('POST /api/auth/register', () => {
  it('creates a user and returns 201 with a token', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.name).toBe('Test User');
  });

  it('never returns the password', async () => {
    const res = await register();

    expect(res.body.user).not.toHaveProperty('password');
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
  });

  it('rejects a duplicate email', async () => {
    await register();
    const res = await register();

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });

  it('treats email case-insensitively when checking for duplicates', async () => {
    await register();
    const res = await register({ email: 'TEST@Example.com' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });

  it('rejects mismatched passwords', async () => {
    const res = await register({ confirmPassword: 'SomethingElse123!' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PASSWORD_MISMATCH');
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await register({ password: 'short1', confirmPassword: 'short1' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WEAK_PASSWORD');
  });

  it('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'only-email@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_FIELDS');
  });

  it('accepts emails with long endings such as .info', async () => {
    const res = await register({ email: 'learner@example.info' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('learner@example.info');
  });

  it('issues a token that expires seven days after it was issued', async () => {
    const res = await register();
    const decoded = verifyToken(res.body.token);

    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 and a token for correct credentials', async () => {
    await register();
    const res = await login({ email: 'test@example.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('test@example.com');
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
  });

  it('returns the same 401 message for a wrong password and an unknown email', async () => {
    await register();

    const wrongPassword = await login({ email: 'test@example.com', password: 'WrongPass123!' });
    const unknownEmail = await login({ email: 'nobody@example.com', password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects missing fields', async () => {
    const res = await login({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_FIELDS');
  });
});

describe('GET /api/auth/profile', () => {
  it('returns 200 with the profile for a valid token, without the password', async () => {
    const { body } = await register();
    const res = await getProfile(body.token);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user).not.toHaveProperty('password');
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
  });
});

describe('data isolation between users', () => {
  it("returns each user's own profile, never another user's", async () => {
    const a = await register({ email: 'a@example.com', name: 'User A' });
    const b = await register({ email: 'b@example.com', name: 'User B' });

    const profileA = await getProfile(a.body.token);
    const profileB = await getProfile(b.body.token);

    expect(profileA.body.user.email).toBe('a@example.com');
    expect(profileB.body.user.email).toBe('b@example.com');
    expect(JSON.stringify(profileA.body)).not.toContain('b@example.com');
    expect(JSON.stringify(profileB.body)).not.toContain('a@example.com');
  });

  it("updating one user's profile does not change another user's", async () => {
    const a = await register({ email: 'a@example.com', name: 'User A' });
    const b = await register({ email: 'b@example.com', name: 'User B' });

    const update = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${a.body.token}`)
      .send({ name: 'User A Renamed', learningPreferences: { pace: 'fast' } });

    expect(update.status).toBe(200);
    expect(update.body.user.name).toBe('User A Renamed');
    expect(update.body.user.learningPreferences.pace).toBe('fast');

    const profileB = await getProfile(b.body.token);
    expect(profileB.body.user.name).toBe('User B');
    expect(profileB.body.user.learningPreferences.pace).toBe('normal');
  });
});
