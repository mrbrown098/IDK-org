# IDK.org API Documentation

Complete reference for all backend API endpoints. Used by web frontend and mobile app.

---

## Base URL

```
Development: http://localhost:5000/api
Production: https://api.idk.org/api
```

---

## Authentication

All protected endpoints require a JWT token in the header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Get a token by logging in at `/auth/login`.

---

## Endpoints Overview

### Authentication Routes
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login and get JWT token
- `POST /auth/logout` - Logout
- `POST /auth/refresh-token` - Get new JWT token

### User Routes
- `GET /user/profile` - Get user profile (protected)
- `PUT /user/profile` - Update user profile (protected)
- `GET /user/settings` - Get user settings (protected)
- `PUT /user/settings` - Update user settings (protected)

### Quiz Routes
- `GET /quiz/questions` - Get all 10 quiz questions
- `POST /quiz/submit` - Submit quiz answers and get Ideotype
- `GET /quiz/result` - Get user's last quiz result (protected)

### Tutor Routes
- `POST /tutor/chat` - Send a message to the study coach (protected)
- `GET /tutor/history` - Planned, not built yet
- `POST /tutor/subject` - Planned, not built yet

### Learning Routes
- `GET /learning/progress` - Get learning progress (protected)
- `POST /learning/session` - Start learning session (protected)
- `PUT /learning/session/:id` - Update session (protected)
- `GET /learning/recommendations` - Get personalized recommendations (protected)

---

## Detailed Endpoint Reference

### AUTHENTICATION

#### POST `/auth/register`
**Description:** Create a new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "confirmPassword": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-06-02T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

#### POST `/auth/login`
**Description:** Login and receive JWT token

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "7d"
}
```

**Error (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### QUIZ

#### GET `/quiz/questions`
**Description:** Get all 10 learning preference quiz questions. Public endpoint.
**Authorization:** None

**Request:**
```
GET /api/quiz/questions
```

**Response (200):**
```json
{
  "success": true,
  "totalQuestions": 10,
  "questions": [
    {
      "id": 1,
      "question": "When learning how to use a new phone or computer app, what helps you get comfortable fastest?",
      "options": [
        { "id": "a", "text": "Watching a screen recording or diagram of the interface" },
        { "id": "b", "text": "Tapping around, trying buttons, and testing what happens directly" },
        { "id": "c", "text": "Reading step-by-step instructions or online documentation" },
        { "id": "d", "text": "Listening to someone explain how the main features work" }
      ]
    }
  ]
}
```

---

#### POST `/quiz/submit`
**Description:** Submit answers for all 10 questions, compute learning preference scores, and save to profile.
**Authorization:** Required (Bearer token)

**Request:**
```json
{
  "answers": [
    { "questionId": 1, "optionId": "a" },
    { "questionId": 2, "optionId": "b" },
    { "questionId": 3, "optionId": "d" },
    { "questionId": 4, "optionId": "c" },
    { "questionId": 5, "optionId": "a" },
    { "questionId": 6, "optionId": "c" },
    { "questionId": 7, "optionId": "b" },
    { "questionId": 8, "optionId": "b" },
    { "questionId": 9, "optionId": "c" },
    { "questionId": 10, "optionId": "d" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "result": {
    "primary": "visual",
    "secondary": null,
    "isTied": false,
    "scores": {
      "visual": 10,
      "auditory": 0,
      "readingWriting": 0,
      "handsOn": 0
    },
    "takenAt": "2026-10-18T07:30:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid answers (missing, fewer/more than 10, duplicate questionId, unknown questionId or optionId).
- `401` - Missing or invalid JWT token.

---

#### GET `/quiz/result`
**Description:** Retrieve the authenticated user's saved quiz result.
**Authorization:** Required (Bearer token)

**Request:**
```
GET /api/quiz/result
```

**Response (200):**
```json
{
  "success": true,
  "result": {
    "primary": "visual",
    "secondary": null,
    "isTied": false,
    "scores": {
      "visual": 10,
      "auditory": 0,
      "readingWriting": 0,
      "handsOn": 0
    },
    "takenAt": "2026-10-18T07:30:00.000Z"
  }
}
```

**Errors:**
- `401` - Missing or invalid JWT token.
- `404` - User has not yet completed the quiz (`QUIZ_NOT_TAKEN`).


### TUTOR (STUDY COACH)

The tutor is a **rule-based study coach**, not an AI model. It costs nothing to run and cannot look up facts or answer subject questions. It reads the message for a simple intent (stuck, revise, plan, explain, greeting) and replies with study strategies matched to the learning preference saved by the quiz. Chat history is not stored.

#### POST `/tutor/chat`
**Description:** Send a message to the study coach

**Authorization:** Required (Bearer token)

**Request:**
```json
{
  "message": "I'm stuck on photosynthesis",
  "subject": "biology",
  "topic": "photosynthesis"
}
```

- `message` (required): text, 1-1000 characters.
- `subject`, `topic` (optional): text, up to 100 characters. Used to name the topic in the reply.

**Response (200):**
```json
{
  "success": true,
  "response": {
    "tutorMessage": "Feeling stuck on photosynthesis is normal...",
    "steps": [
      "Draw a quick diagram or mind map of photosynthesis...",
      "Use colours: one colour for key words and another for examples.",
      "Try one small example of photosynthesis yourself before reading more about it."
    ],
    "suggestions": ["Help me revise", "Help me make a study plan", "How can I learn this?"],
    "mode": "study-coach",
    "intent": "stuck",
    "preference": "visual",
    "secondaryPreference": "handsOn",
    "quizTaken": true,
    "timestamp": "2026-06-02T10:35:00.000Z"
  }
}
```

- `intent`: one of `greeting`, `stuck`, `revise`, `plan`, `explain`, `general`.
- `preference` / `secondaryPreference`: from the saved quiz result, or `null`. If the quiz has not been taken, `quizTaken` is `false` and general tips are returned.
- `steps` is empty for a `greeting`.

**Errors:**
- `400` `INVALID_MESSAGE` - message missing, blank or not text.
- `400` `MESSAGE_TOO_LONG` - message over 1000 characters.
- `400` `INVALID_FIELD` - subject or topic not text, or over 100 characters.
- `401` - missing or invalid token.
- `404` `USER_NOT_FOUND` - the token's user no longer exists.
- `429` - too many messages (default 60 per 15 minutes per IP; set `TUTOR_RATE_LIMIT_MAX` to change).
- `500` `TUTOR_CHAT_ERROR` - unexpected server error.

---

### LEARNING

#### GET `/learning/progress`
**Description:** Get user's learning progress and statistics

**Authorization:** Required (Bearer token)

**Request:**
```
GET /learning/progress
```

**Response (200):**
```json
{
  "success": true,
  "progress": {
    "totalLessonsTaken": 15,
    "totalMinutesPracticed": 240,
    "overallScore": 0.82,
    "lastSessionDate": "2026-06-02T09:00:00Z",
    "subjects": [
      {
        "name": "Python Programming",
        "progress": 0.65,
        "lessonsCompleted": 8
      }
    ]
  }
}
```

---

#### GET `/learning/recommendations`
**Description:** Get AI-generated personalized learning recommendations

**Authorization:** Required (Bearer token)

**Request:**
```
GET /learning/recommendations?subject=python
```

**Response (200):**
```json
{
  "success": true,
  "recommendations": [
    {
      "type": "focus",
      "title": "You're struggling with Functions",
      "description": "Your mastery score is 45%. Try visual flowcharts.",
      "action": "Start visual tutorial"
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional information if applicable"
}
```

### Common Error Codes

- `UNAUTHORIZED` (401) - Missing or invalid token
- `FORBIDDEN` (403) - Access denied
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input
- `SERVER_ERROR` (500) - Internal server error

---

## Rate Limiting

To prevent abuse:

```
- Unauthenticated: 100 requests/hour
- Authenticated: 1000 requests/hour
- Tutor chat: 60 messages per 15 minutes per IP (TUTOR_RATE_LIMIT_MAX)
```

---

## Response Headers

All responses include:

```
Content-Type: application/json
X-Request-ID: unique_request_id
X-Response-Time: milliseconds
```

---

## Usage Examples

### JavaScript/Fetch
```javascript
// Register
const response = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    name: 'John Doe',
    confirmPassword: 'SecurePassword123!'
  })
});
const data = await response.json();
const token = data.token;
```

### React Component
```javascript
import React, { useState } from 'react';

function QuizComponent() {
  const [questions, setQuestions] = useState([]);

  React.useEffect(() => {
    fetch('http://localhost:5000/api/quiz/questions')
      .then(res => res.json())
      .then(data => setQuestions(data.questions));
  }, []);

  return (
    <div>
      {questions.map(q => (
        <div key={q.id}>{q.question}</div>
      ))}
    </div>
  );
}
```

---

**API Version: 1.0**
