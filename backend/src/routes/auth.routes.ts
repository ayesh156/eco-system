import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  updateMe,
  changePassword,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { authRateLimiter, loginRateLimiter, sensitiveRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ===================================
// Validation Schemas
// ===================================

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('shopSlug')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Shop slug must be between 2 and 50 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

// ===================================
// Public Routes (No Auth Required)
// ===================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @rateLimit 10 attempts per 15 minutes
 */
router.post('/register', authRateLimiter, registerValidation, register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user & get tokens
 * @access  Public
 * @rateLimit 5 failed attempts per hour (per IP+email)
 */
router.post('/login', authRateLimiter, loginRateLimiter, loginValidation, login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token cookie
 * @access  Public (requires valid refresh token cookie)
 * @rateLimit Standard API rate limit
 */
router.post('/refresh', authRateLimiter, refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Public
 */
router.post('/logout', logout);

// ===================================
// Protected Routes (Auth Required)
// ===================================

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', protect, sensitiveRateLimiter, logoutAll);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, getMe);

/**
 * @route   PUT /api/v1/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', protect, sensitiveRateLimiter, updateProfileValidation, updateMe);

/**
 * @route   PUT /api/v1/auth/password
 * @desc    Change password
 * @access  Private
 * @rateLimit Extra protection for password changes
 */
router.put('/password', protect, sensitiveRateLimiter, changePasswordValidation, changePassword);

export default router;
