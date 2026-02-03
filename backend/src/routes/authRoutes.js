import express from 'express';
import {
    register,
    login,
    getProfile,
    updateProfile
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import {
    validateRegistration,
    validateLogin
} from '../middleware/validation.js';

const router = express.Router();

/**
 * Authentication Routes
 */

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', validateRegistration, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, login);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, updateProfile);

export default router;
