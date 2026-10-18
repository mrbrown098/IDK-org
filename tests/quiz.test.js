import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import { useTestDatabase } from './helpers/db.js';

useTestDatabase();

const registerUser = async (email = `test_${Date.now()}_${Math.random()}@example.com`) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Quiz Tester',
      email,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    });
  return { token: res.body.token, user: res.body.user };
};

// 10 answers where all options correspond to 'visual' preference
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

// 5 auditory and 5 visual answers (tie between auditory and visual)
const tiedAuditoryVisualAnswers = [
  { questionId: 1, optionId: 'a' }, // visual
  { questionId: 2, optionId: 'a' }, // auditory
  { questionId: 3, optionId: 'd' }, // visual
  { questionId: 4, optionId: 'd' }, // auditory
  { questionId: 5, optionId: 'a' }, // visual
  { questionId: 6, optionId: 'a' }, // auditory
  { questionId: 7, optionId: 'b' }, // visual
  { questionId: 8, optionId: 'c' }, // auditory
  { questionId: 9, optionId: 'c' }, // visual
  { questionId: 10, optionId: 'b' } // auditory
];

describe('GET /api/quiz/questions', () => {
  it('works without an auth token and returns 10 questions with sanitized options', async () => {
    const res = await request(app).get('/api/quiz/questions');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalQuestions).toBe(10);
    expect(res.body.questions).toHaveLength(10);

    // Verify option mapping is not leaked
    for (const q of res.body.questions) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('question');
      expect(q.options).toHaveLength(4);
      for (const opt of q.options) {
        expect(opt).toHaveProperty('id');
        expect(opt).toHaveProperty('text');
        expect(opt).not.toHaveProperty('preference');
        expect(opt).not.toHaveProperty('weight');
      }
    }
  });
});

describe('POST /api/quiz/submit', () => {
  it('rejects submissions without an auth token with 401', async () => {
    const res = await request(app)
      .post('/api/quiz/submit')
      .send({ answers: allVisualAnswers });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_TOKEN');
  });

  it('rejects payloads with fewer than 10 answers with 400', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: allVisualAnswers.slice(0, 9) });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ANSWERS_COUNT');
  });

  it('rejects duplicate questionIds with 400', async () => {
    const { token } = await registerUser();
    const duplicateAnswers = [
      ...allVisualAnswers.slice(0, 9),
      { questionId: 1, optionId: 'a' } // duplicate question 1 instead of question 10
    ];

    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: duplicateAnswers });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DUPLICATE_QUESTION_ANSWER');
  });

  it('rejects unknown questionId with 400', async () => {
    const { token } = await registerUser();
    const invalidAnswers = [
      ...allVisualAnswers.slice(0, 9),
      { questionId: 99, optionId: 'a' }
    ];

    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: invalidAnswers });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_QUESTION_ID');
  });

  it('rejects unknown optionId with 400', async () => {
    const { token } = await registerUser();
    const invalidAnswers = [
      ...allVisualAnswers.slice(0, 9),
      { questionId: 10, optionId: 'z' }
    ];

    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: invalidAnswers });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_OPTION_ID');
  });

  it('calculates primary preference accurately and saves it on user profile', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: allVisualAnswers });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result.primary).toBe('visual');
    expect(res.body.result.isTied).toBe(false);
    expect(res.body.result.scores.visual).toBe(10);
    expect(res.body.result.scores.auditory).toBe(0);
    expect(res.body.result.scores.readingWriting).toBe(0);
    expect(res.body.result.scores.handsOn).toBe(0);

    // Verify it is saved on profile
    const profileRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.user.ideotype.primary).toBe('visual');
  });

  it('handles tied scores deterministically and reports top two preferences', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: tiedAuditoryVisualAnswers });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result.isTied).toBe(true);
    expect(res.body.result.scores.auditory).toBe(5);
    expect(res.body.result.scores.visual).toBe(5);
    // Alphabetical tie-break: auditory first, visual second
    expect(res.body.result.primary).toBe('auditory');
    expect(res.body.result.secondary).toBe('visual');
  });
});

describe('GET /api/quiz/result', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/quiz/result');
    expect(res.status).toBe(401);
  });

  it('returns 404 if the user has not taken the quiz yet', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get('/api/quiz/result')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('QUIZ_NOT_TAKEN');
  });

  it('returns the saved result after submission', async () => {
    const { token } = await registerUser();

    await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: allVisualAnswers });

    const res = await request(app)
      .get('/api/quiz/result')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result.primary).toBe('visual');
    expect(res.body.result.scores.visual).toBe(10);
  });

  it('isolates quiz results between users', async () => {
    const userA = await registerUser();
    const userB = await registerUser();

    // User A takes quiz
    await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ answers: allVisualAnswers });

    // User A gets result
    const resA = await request(app)
      .get('/api/quiz/result')
      .set('Authorization', `Bearer ${userA.token}`);
    expect(resA.status).toBe(200);
    expect(resA.body.result.primary).toBe('visual');

    // User B has not taken quiz and gets 404
    const resB = await request(app)
      .get('/api/quiz/result')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(resB.status).toBe(404);
    expect(resB.body.code).toBe('QUIZ_NOT_TAKEN');
  });
});
