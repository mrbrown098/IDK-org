import express from 'express';
import { chat } from '../controllers/tutorController.js';
import { authenticateToken } from '../config/jwt.js';

const router = express.Router();

// Protected route (requires authentication)
router.post('/chat', authenticateToken, chat);

export default router;
