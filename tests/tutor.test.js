import request from 'supertest';
import { describe, it, expect, afterEach } from 'vitest';
import app from '../src/app.js';
import { useTestDatabase } from './helpers/db.js';
import {
  detectIntent,
  cleanLabel,
  buildTutorReply,
  PREFERENCES
} from '../src/services/tutorService.js';

useTestDatabase();

const registerUser = async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Tutor Tester',
      email: `tutor_${Date.now()}_${Math.random()}@example.com`,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    });
  return { token: res.body.token };
};

// All options map to 'visual'
const allVisualAnswers = [
  { questionId: 1, optionId: 'a' },
  { questionId: 2, optionId: 'b' },
  { questionId: 3, optionId: 'd' },
  { questionId: 4, optionId: 'c' },
  { questionId: 5, optionId: 'a' },
  { questionId: 6, optionId: 'c' },
  { questionId: 7, optionId: 'b' },
  { questionId: 8, optionId: 'b' },
  { questionId: 9, optionId: 'c' },
  { questionId: 10, optionId: 'd' }
];

// 5 visual + 5 auditory (tie)
const tiedAnswers = [
  { questionId: 1, optionId: 'a' },
  { questionId: 2, optionId: 'a' },
  { questionId: 3, optionId: 'd' },
  { questionId: 4, optionId: 'd' },
  { questionId: 5, optionId: 'a' },
  { questionId: 6, optionId: 'a' },
  { questionId: 7, optionId: 'b' },
  { questionId: 8, optionId: 'c' },
  { questionId: 9, optionId: 'c' },
  { questionId: 10, optionId: 'b' }
];

const takeQuiz = (token, answers) =>
  request(app)
    .post('/api/quiz/submit')
    .set('Authorization', `Bearer ${token}`)
    .send({ answers });

const chat = (token, body, extra = {}) => {
  let r = request(app).post('/api/tutor/chat');
  if (token) r = r.set('Authorization', `Bearer ${token}`);
  for (const [k, v] of Object.entries(extra)) r = r.set(k, v);
  return r.send(body);
};

describe('tutorService (no database)', () => {
  it('detects intents in order, with greeting only when nothing else matches', () => {
    expect(detectIntent("I'm stuck on fractions")).toBe('stuck');
    expect(detectIntent('exam next week')).toBe('revise');
    expect(detectIntent('can you make a study schedule')).toBe('plan');
    expect(detectIntent('explain gravity')).toBe('explain');
    expect(detectIntent('hello')).toBe('greeting');
    expect(detectIntent('hello, I am confused')).toBe('stuck');
    expect(detectIntent('banana')).toBe('general');
    expect(detectIntent(undefined)).toBe('general');
  });

  it('cleanLabel strips angle brackets, control characters and extra spaces', () => {
    expect(cleanLabel('  <b>Bio</b>\n\tlogy  ')).toBe('b Bio /b logy');
    expect(cleanLabel('a'.repeat(200))).toHaveLength(60);
    expect(cleanLabel(42)).toBe('');
  });

  it('uses general tips and mentions the quiz when no result is saved', () => {
    const reply = buildTutorReply({ message: 'help me learn', topic: 'algebra' });
    expect(reply.quizTaken).toBe(false);
    expect(reply.preference).toBeNull();
    expect(reply.steps).toHaveLength(3);
    expect(reply.tutorMessage).toContain('quiz');
    expect(reply.mode).toBe('study-coach');
  });

  it('adds one tip from the secondary preference', () => {
    const reply = buildTutorReply({
      message: 'help me learn',
      topic: 'algebra',
      ideotype: { primary: 'visual', secondary: 'handsOn' }
    });
    expect(reply.preference).toBe('visual');
    expect(reply.secondaryPreference).toBe('handsOn');
    expect(reply.steps).toHaveLength(3);
    expect(reply.steps[2]).toContain('example');
  });

  it('ignores an invalid or identical secondary preference', () => {
    expect(
      buildTutorReply({ message: 'x', ideotype: { primary: 'visual', secondary: 'visual' } })
        .secondaryPreference
    ).toBeNull();
    expect(
      buildTutorReply({ message: 'x', ideotype: { primary: 'nonsense' } }).quizTaken
    ).toBe(false);
  });

  it('greeting has no steps and suggestions never repeat the current intent', () => {
    const greeting = buildTutorReply({ message: 'hi' });
    expect(greeting.intent).toBe('greeting');
    expect(greeting.steps).toEqual([]);

    const stuck = buildTutorReply({ message: "I'm stuck" });
    expect(stuck.suggestions).toHaveLength(3);
    expect(stuck.suggestions).not.toContain("I'm stuck on this");
  });

  it('covers every preference with three tips', () => {
    for (const p of PREFERENCES) {
      const reply = buildTutorReply({ message: 'help', ideotype: { primary: p } });
      expect(reply.preference).toBe(p);
      expect(reply.steps).toHaveLength(3);
    }
  });

  it('does not echo the raw message', () => {
    const reply = buildTutorReply({ message: 'SECRET-MARKER-12345 help' });
    expect(JSON.stringify(reply)).not.toContain('SECRET-MARKER-12345');
  });
});

describe('POST /api/tutor/chat', () => {
  it('rejects requests without a token with 401', async () => {
    const res = await chat(null, { message: 'hi' });
    expect(res.status).toBe(401);
  });

  it('rejects a missing or blank message with INVALID_MESSAGE', async () => {
    const { token } = await registerUser();
    for (const body of [{}, { message: '   ' }, { message: 123 }]) {
      const res = await chat(token, body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_MESSAGE');
    }
  });

  it('rejects a message over 1000 characters with MESSAGE_TOO_LONG', async () => {
    const { token } = await registerUser();
    const res = await chat(token, { message: 'a'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MESSAGE_TOO_LONG');
  });

  it('rejects an invalid subject or topic with INVALID_FIELD', async () => {
    const { token } = await registerUser();
    const a = await chat(token, { message: 'hi', subject: 5 });
    expect(a.status).toBe(400);
    expect(a.body.code).toBe('INVALID_FIELD');
    const b = await chat(token, { message: 'hi', topic: 'x'.repeat(101) });
    expect(b.status).toBe(400);
    expect(b.body.code).toBe('INVALID_FIELD');
  });

  it('replies with general tips when the quiz has not been taken', async () => {
    const { token } = await registerUser();
    const res = await chat(token, { message: "I'm stuck", topic: 'algebra' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response.quizTaken).toBe(false);
    expect(res.body.response.intent).toBe('stuck');
    expect(res.body.response.steps).toHaveLength(3);
    expect(res.body.response.tutorMessage).toContain('algebra');
    expect(typeof res.body.response.timestamp).toBe('string');
  });

  it('matches tips to the saved quiz result', async () => {
    const { token } = await registerUser();
    expect((await takeQuiz(token, allVisualAnswers)).status).toBe(200);

    const res = await chat(token, { message: 'help me revise', subject: 'biology' });
    expect(res.status).toBe(200);
    expect(res.body.response.quizTaken).toBe(true);
    expect(res.body.response.preference).toBe('visual');
    expect(res.body.response.intent).toBe('revise');
  });

  it('includes a secondary preference after a tied quiz result', async () => {
    const { token } = await registerUser();
    expect((await takeQuiz(token, tiedAnswers)).status).toBe(200);

    const res = await chat(token, { message: 'explain this' });
    expect(res.status).toBe(200);
    expect(res.body.response.quizTaken).toBe(true);
    expect(res.body.response.secondaryPreference).not.toBeNull();
    expect(res.body.response.secondaryPreference).not.toBe(res.body.response.preference);
  });

  it('does not echo the raw message back', async () => {
    const { token } = await registerUser();
    const res = await chat(token, { message: 'SECRET-MARKER-98765 <script>' });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('SECRET-MARKER-98765');
  });
});

describe('tutor rate limiting', () => {
  const originalEnable = process.env.ENABLE_TUTOR_RATE_LIMIT_TEST;
  const originalMax = process.env.TUTOR_RATE_LIMIT_MAX;

  afterEach(() => {
    if (originalEnable !== undefined) process.env.ENABLE_TUTOR_RATE_LIMIT_TEST = originalEnable;
    else delete process.env.ENABLE_TUTOR_RATE_LIMIT_TEST;
    if (originalMax !== undefined) process.env.TUTOR_RATE_LIMIT_MAX = originalMax;
    else delete process.env.TUTOR_RATE_LIMIT_MAX;
  });

  it('returns 429 once the limit is reached when enabled', async () => {
    const { token } = await registerUser();
    process.env.ENABLE_TUTOR_RATE_LIMIT_TEST = 'true';
    process.env.TUTOR_RATE_LIMIT_MAX = '2';
    const ip = { 'X-Forwarded-For': '198.51.100.77' };

    expect((await chat(token, { message: 'hi' }, ip)).status).toBe(200);
    expect((await chat(token, { message: 'hi' }, ip)).status).toBe(200);

    const res = await chat(token, { message: 'hi' }, ip);
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      message: 'Too many messages, please slow down and try again later.'
    });
  });
});
