import express from 'express';
import { login, register, refresh, logout, googleLogin, getProfile, updateProfile } from '../controllers/authcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Strict rate limit on credential endpoints to blunt brute-force attempts.
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.post('/google', authLimiter, googleLogin);

router.get('/me', protectRoute, getProfile);
router.patch('/me', protectRoute, updateProfile);

export default router;
