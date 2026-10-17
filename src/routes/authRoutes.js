import express from 'express';
import { register, login, getProfile, updateProfile, logout } from '../controllers/authController.js';
import { authenticateToken } from '../config/jwt.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

export default router;
