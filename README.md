# IDK.org - Intellect Driven Knowledge

> **An AI-powered personalized learning platform that understands how YOUR brain learns and adapts teaching to match it.**

---

## The Problem

Traditional education fails millions of learners because it uses a **one-size-fits-all approach**. Students are forced into the same classroom, same pace, same teaching style — regardless of how their unique brain actually processes information.

Result? Brilliant minds struggle, lose confidence, and give up on learning.

## The Solution

**IDK.org diagnoses your unique learning profile and becomes your personal AI tutor.**

Instead of memorizing how YOU must adapt to teaching, we adapt teaching to match how YOU learn.

---

## How It Works

### 1️⃣ **Brain Mapping** (2-5 minutes)
- Answer 10 targeted diagnostic questions
- AI analyzes 3 neural encoding channels:
  - **Visual Processing** - How you see and visualize information
  - **Auditory Processing** - How you listen and absorb sound
  - **Linguistic Processing** - How you read, write, and understand language
- Get your unique **Ideotype Profile**

### 2️⃣ **Personalized Learning**
- Tell the app what you want to learn (Python, calculus, languages, etc.)
- AI tutor adapts:
  - **Format**: Visual diagrams? Step-by-step text? Audio explanations?
  - **Pace**: Fast track through concepts you grasp instantly, slow down when needed
  - **Style**: Real-world examples? Theory first? Hands-on practice?
  - **Difficulty**: Auto-adjusts based on your answers

### 3️⃣ **Real-Time Adaptation**
- As you learn, the app gets smarter about you
- Learns your weak spots and strengthens them
- Celebrates wins and keeps you motivated
- Tracks your actual learning progress (not just grades)

---

## Key Features

✨ **Neural Profile Detection** - Scientifically maps your learning style in minutes  
🎯 **Learn Anything** - Any subject, any skill, any topic  
🤖 **AI Tutor** - Never gets tired, never judges, always available  
📊 **Real Progress Tracking** - See actual learning gains, not just scores  
🎓 **Adaptive Difficulty** - Goldilocks principle: not too easy, not too hard  
🌍 **Accessible** - Works on web and mobile  
🔐 **Private** - Your learning data stays yours  

---

## Why IDK.org Is Different

| Feature | Traditional School | Traditional Apps | IDK.org |
|---------|-------------------|------------------|---------|
| **Knows how YOU learn** | ❌ | ❌ | ✅ |
| **Personalizes teaching style** | ❌ | Partial | ✅ |
| **Available 24/7** | ❌ | ✅ | ✅ |
| **Never judges** | ❌ | ✅ | ✅ |
| **Teaches ANYTHING** | Limited | Limited | ✅ |
| **Adapts in real-time** | ❌ | ❌ | ✅ |
| **Based on neuroscience** | ❌ | ❌ | ✅ |

---

## Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React (Web), React Native (Mobile)
- **AI Engine**: Claude API
- **Database**: MongoDB
- **Deployment**: Cloud infrastructure

---

## Quick Start

### For Users
1. Visit IDK.org
2. Take the 2-minute diagnostic quiz
3. Start learning with your personal AI tutor

### For Developers
```bash
# Clone the repository
git clone https://github.com/mrbrown098/idk-org.git
cd idk-org

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env: JWT_SECRET is REQUIRED (the server will not start without it).
# See SETUP.md for how to generate one.

# Start the development server
npm start
```

Server runs at `http://localhost:5000`

---

## Architecture Overview

```
User Interface (Web/Mobile)
        ↓
   Express API Server
        ↓
    ┌───┴────────────────┐
    ↓                    ↓
Quiz Engine         AI Tutor Engine
    ↓                    ↓
  MongoDB ←─────→ Claude API
```

- **Quiz Engine**: Diagnostic questions → Neural profile mapping
- **AI Tutor**: Personalized lesson generation and adaptation
- **Database**: Stores user profiles, progress, learning data
- **Claude API**: Powers intelligent tutoring conversations

---

## Project Structure

```
idk-org/
├── src/
│   ├── config/          # Configuration files
│   ├── routes/          # API endpoints
│   ├── controllers/     # Business logic
│   ├── models/          # Database schemas
│   ├── services/        # Business services
│   ├── middleware/      # Express middleware
│   └── utils/           # Utility functions
├── frontend/            # Web application (React)
├── mobile/              # Mobile application (React Native)
├── docs/                # Documentation
└── tests/               # Test suite
```

See `PROJECT_STRUCTURE.md` for detailed folder breakdown.

---

## API Documentation

Complete API reference available in `API.md`. Endpoints include:

- Authentication (register, login, logout)
- Quiz system (questions, submission, results)
- AI Tutor (chat, history, subject selection)
- Learning progress (tracking, recommendations)
- User profiles (settings, preferences)

---

## Development

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Claude API key

### Setup Instructions

See `SETUP.md` for complete setup guide including:
- Database configuration
- Environment variables
- API key setup
- Local development server

---

## License

MIT License - See LICENSE file for details

This code is open source and available for commercial and personal use with attribution.

---

## Support

**Issues & Bugs:**
- Use GitHub Issues for bug reports and feature requests

**Questions:**
- Check the documentation files in `/docs`
- Review API.md for technical details
- See SETUP.md for configuration help

---

**IDK.org — Because your brain is unique. Your education should be too.**
Local dev note: tests run with `npm test`.
