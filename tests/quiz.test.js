import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import User from '../src/models/User.js';
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
const baseVisualAnswers = [
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

// 5 social answers (all group)
const allGroupSocialAnswers = [
  { questionId: 11, optionId: 'a' },
  { questionId: 12, optionId: 'a' },
  { questionId: 13, optionId: 'a' },
  { questionId: 14, optionId: 'a' },
  { questionId: 15, optionId: 'a' }
];

// 5 social answers (all solo)
const allSoloSocialAnswers = [
  { questionId: 11, optionId: 'b' },
  { questionId: 12, optionId: 'b' },
  { questionId: 13, optionId: 'b' },
  { questionId: 14, optionId: 'b' },
  { questionId: 15, optionId: 'b' }
];

// 3 group, 2 solo (flexible)
const flexibleSocialAnswers = [
  { questionId: 11, optionId: 'a' }, // group
  { questionId: 12, optionId: 'a' }, // group
  { questionId: 13, optionId: 'a' }, // group
  { questionId: 14, optionId: 'b' }, // solo
  { questionId: 15, optionId: 'b' }  // solo
];

// 15 answers where mode is 10 visual, social is 5 group
const allVisualAnswers = [
  ...baseVisualAnswers,
  ...allGroupSocialAnswers
];

// 5 auditory, 5 visual answers (tie), and 5 group
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
  { questionId: 10, optionId: 'b' }, // auditory
  ...allGroupSocialAnswers
];

describe('GET /api/quiz/questions', () => {
  it('works without an auth token and returns 15 questions with sanitized options', async () => {
    const res = await request(app).get('/api/quiz/questions');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalQuestions).toBe(15);
    expect(res.body.questions).toHaveLength(15);

    // Verify option mapping is not leaked
    for (const q of res.body.questions) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('question');
      if (q.id <= 10) {
        expect(q.options).toHaveLength(4);
      } else {
        expect(q.options).toHaveLength(2);
      }
      for (const opt of q.options) {
        expect(opt).toHaveProperty('id');
        expect(opt).toHaveProperty('text');
        expect(opt).not.toHaveProperty('preference');
        expect(opt).not.toHaveProperty('social');
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

  it('rejects payloads with fewer than 15 answers with 400', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: allVisualAnswers.slice(0, 14) });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ANSWERS_COUNT');
  });

  it('rejects duplicate questionIds with 400', async () => {
    const { token } = await registerUser();
    const duplicateAnswers = [
      ...allVisualAnswers.slice(0, 14),
      { questionId: 1, optionId: 'a' } // duplicate question 1 instead of question 15
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
      ...allVisualAnswers.slice(0, 14),
      { questionId: 99, optionId: 'a' }
    ];

    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: invalidAnswers });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_QUESTION_ID');
  });

  it('rejects unknown optionId on preference questions with 400', async () => {
    const { token } = await registerUser();
    const invalidAnswers = allVisualAnswers.map(a =>
      a.questionId === 10 ? { questionId: 10, optionId: 'z' } : a
    );

    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: invalidAnswers });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_OPTION_ID');
  });

  it('rejects unknown optionId on social questions (questions 11-15) with 400', async () => {
    const { token } = await registerUser();
    const invalidAnswers = allVisualAnswers.map(a =>
      a.questionId === 15 ? { questionId: 15, optionId: 'z' } : a
    );

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

  it('correctly determines socialStyle as group, solo, or flexible', async () => {
    // 1. Group style (5 group, 0 solo)
    const { token: tokenGroup } = await registerUser();
    const resGroup = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${tokenGroup}`)
      .send({ answers: allVisualAnswers });

    expect(resGroup.status).toBe(200);
    expect(resGroup.body.result.socialStyle).toBe('group');
    expect(resGroup.body.result.social).toEqual({ group: 5, solo: 0 });
    expect(resGroup.body.result.percentages.social).toBe(100);

    // 2. Solo style (0 group, 5 solo)
    const { token: tokenSolo } = await registerUser();
    const resSolo = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${tokenSolo}`)
      .send({ answers: [...baseVisualAnswers, ...allSoloSocialAnswers] });

    expect(resSolo.status).toBe(200);
    expect(resSolo.body.result.socialStyle).toBe('solo');
    expect(resSolo.body.result.social).toEqual({ group: 0, solo: 5 });
    expect(resSolo.body.result.percentages.social).toBe(0);

    // 3. Flexible style (3 group, 2 solo)
    const { token: tokenFlex } = await registerUser();
    const resFlex = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${tokenFlex}`)
      .send({ answers: [...baseVisualAnswers, ...flexibleSocialAnswers] });

    expect(resFlex.status).toBe(200);
    expect(resFlex.body.result.socialStyle).toBe('flexible');
    expect(resFlex.body.result.social).toEqual({ group: 3, solo: 2 });
    expect(resFlex.body.result.percentages.social).toBe(60);

    // 4. Flexible style (2 group, 3 solo)
    const { token: tokenFlex2 } = await registerUser();
    const flex2Answers = [
      ...baseVisualAnswers,
      { questionId: 11, optionId: 'a' }, // group
      { questionId: 12, optionId: 'a' }, // group
      { questionId: 13, optionId: 'b' }, // solo
      { questionId: 14, optionId: 'b' }, // solo
      { questionId: 15, optionId: 'b' }  // solo
    ];
    const resFlex2 = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${tokenFlex2}`)
      .send({ answers: flex2Answers });

    expect(resFlex2.status).toBe(200);
    expect(resFlex2.body.result.socialStyle).toBe('flexible');
    expect(resFlex2.body.result.social).toEqual({ group: 2, solo: 3 });
    expect(resFlex2.body.result.percentages.social).toBe(40);
  });

  it('calculates 5 dimension percentages accurately (visual, auditory, readingWriting, handsOn, social)', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/quiz/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: tiedAuditoryVisualAnswers }); // 5 auditory, 5 visual, 5 group

    expect(res.status).toBe(200);
    expect(res.body.result.percentages).toEqual({
      visual: 50,
      auditory: 50,
      readingWriting: 0,
      handsOn: 0,
      social: 100
    });
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

  it('returns the saved result after submission with 5 dimensions', async () => {
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
    expect(res.body.result.socialStyle).toBe('group');
    expect(res.body.result.percentages.visual).toBe(100);
    expect(res.body.result.percentages.social).toBe(100);
  });

  it('loads old saved results without new fields without errors (backward compatibility)', async () => {
    const { token, user } = await registerUser();

    // Directly set an old-format ideotype on the user in MongoDB without social/percentages
    await User.findByIdAndUpdate(user.id, {
      ideotype: {
        primary: 'visual',
        secondary: null,
        isTied: false,
        scores: { visual: 10, auditory: 0, readingWriting: 0, handsOn: 0 },
        takenAt: new Date()
      }
    });

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
