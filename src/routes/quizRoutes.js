import express from 'express';
import { getQuestions, submitQuiz, getQuizResult } from '../controllers/quizController.js';
import { authenticateToken } from '../config/jwt.js';

const router = express.Router();

// Public routes
router.get('/questions', getQuestions);

// Protected routes (require authentication)
router.post('/submit', authenticateToken, submitQuiz);
router.get('/result', authenticateToken, getQuizResult);

export default router;
