import express from 'express';
import { register, login, getMe, logout } from '../controllers/authController.js';
import { registerValidator, loginValidator } from '../validators/authValidator.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, registerValidator, register);
router.post('/login', authLimiter, loginValidator, login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;
