# IDK.org

**Intellect Driven Knowledge. Because "idk" is where learning starts.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](package.json)
![Status](https://img.shields.io/badge/status-early%20development-orange.svg)

Everyone has typed or said "idk" to a homework question, a new skill, a topic that just won't click. IDK.org turns that moment into a plan. You take a short quiz about how you like to learn, and a study coach gives you concrete ways to study, matched to you.

It is open source, it is early, and it is built in the open. If that sounds like your kind of project, come help.

---

## What works today

This is an honest snapshot, not a pitch deck.

| Area | State |
| --- | --- |
| Sign up, log in, JWT sessions | Working |
| 10-question learning preference quiz | Working |
| Result: primary and secondary preference, tie handling | Working |
| Study coach chat (rule-based, free to run) | Working |
| Mobile-friendly web app (plain HTML, CSS, JavaScript) | Working locally |
| Security basics: hashed passwords, rate limiting, strict CORS, secure headers | Working |
| Automated tests (Vitest, supertest, in-memory MongoDB) | Working |
| Public deployment | Next up |
| Android app | Planned |
| An AI tutor that can answer subject questions | Planned |
| Progress tracking, spaced repetition | Planned |

## How it works

1. **Take the quiz.** Ten everyday questions, about two minutes. You get a primary preference, and a secondary one if it was close: visual, auditory, reading and writing, or hands-on.
2. **Talk to the study coach.** Tell it what you are learning and where you are stuck, or that an exam is coming. It replies with study strategies that fit your preference, for example diagrams and mind maps for a visual learner, or explaining out loud for an auditory one.
3. **Come back and retake it.** Preferences change. The quiz is quick, so run it again whenever you want.

The coach is rule-based. It is not a language model, it does not look up facts, and it says so. It helps you study. It does not do your homework.

## A note on the science

We want to be straight about this, because it matters.

The quiz measures what you *prefer*, not how your brain works. It is not a diagnosis. Researchers have found little evidence that teaching someone in their "preferred style" improves how much they learn (see [Pashler et al., 2008](https://doi.org/10.1111/j.1539-6053.2009.01038.x)). What does help, strongly and repeatedly, is practising recall, spacing your study over time, and getting feedback.

So IDK.org uses your preference as a friendly starting point for *how* you practise, and the roadmap is built around the methods that have solid evidence behind them. If you have a background in learning science and want to help us get this right, we would love to hear from you.

## Run it locally

You need Node.js 18 or newer and a MongoDB database (local, or a free MongoDB Atlas cluster).

```bash
git clone https://github.com/mrbrown098/IDK-org.git
cd IDK-org
npm install
cp .env.example .env
```

Open `.env` and set at least:

- `JWT_SECRET`: required, the server will not start without it. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `MONGODB_URI`: your MongoDB connection string

Start the API, then serve the web app in a second terminal:

```bash
npm start                  # API on http://localhost:5000

### Deploy
See [DEPLOY.md](DEPLOY.md) for the step‑by‑step hosting guide.

npx serve docs -l 3000     # web app on http://localhost:3000
```

Run the tests (no database needed, they start an in-memory one):

```bash
npm test
```

More detail is in [SETUP.md](SETUP.md).

## API at a glance

| Method | Endpoint | Auth | What it does |
| --- | --- | --- | --- |
| GET | `/health` | no | Health check |
| POST | `/api/auth/register` | no | Create an account |
| POST | `/api/auth/login` | no | Log in, get a token |
| POST | `/api/auth/logout` | no | Log out (the client discards the token) |
| GET, PUT | `/api/auth/profile` | yes | Read or update your profile |
| GET | `/api/quiz/questions` | no | The 10 quiz questions |
| POST | `/api/quiz/submit` | yes | Submit answers, get and save your result |
| GET | `/api/quiz/result` | yes | Your saved result |
| POST | `/api/tutor/chat` | yes | Talk to the study coach |

Full request and response details are in [API.md](API.md).

## Built with

- Node.js and Express
- MongoDB with Mongoose
- JWT authentication, bcrypt password hashing, Helmet, express-rate-limit
- A single-page web client in plain HTML, CSS and JavaScript (no framework, no build step)
- Vitest and supertest for tests

Hosting plan: the web app and the API run as one Vercel project, the database is on MongoDB Atlas, and an Android app is wrapped from the web app later.

## Roadmap

- [x] Accounts and login
- [x] Learning preference quiz and saved results
- [x] Rule-based study coach
- [x] Mobile-friendly web client
- [x] Hosting hardening: rate limits, strict CORS, secure headers
- [ ] Public deployment (API, database, web app)
- [ ] Privacy policy and account deletion
- [ ] Installable web app, then Android
- [ ] Practice questions and spaced repetition
- [ ] AI tutor that can answer subject questions, with a swappable provider and strict cost limits
- [ ] Progress tracking that shows real learning, not just scores
- [ ] More languages

## Contributing

Contributions of any size are welcome, including small ones. Good places to start:

- Quiz questions in other languages
- An accessibility pass on the web client (keyboard use, screen readers, contrast)
- More tests for edge cases
- Docs that are out of date or confusing
- Study strategies for the coach, ideally with a source for why they work

How to send a change:

1. Open an issue first if it is a big change, so we can agree on the idea.
2. Fork the repo and create a branch from `main`.
3. Keep each commit to one change, with a plain message like `fix(web): stop chat from scrolling past the last message`.
4. Run `npm test` and make sure it passes.
5. Open a pull request and say what you changed and why.

Be kind in issues and reviews. We are all learning.

## For partners and investors

The foundation is built and tested: accounts, a quiz, a coach and a web client, all running locally. The next milestone is a public deployment, then the pieces that give real learning value (practice and spaced repetition) and an AI tutor with proper cost controls. If you want to talk, open an issue titled "Partnership" or reach out through [github.com/mrbrown098](https://github.com/mrbrown098).

## License

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Mr BROWN.
