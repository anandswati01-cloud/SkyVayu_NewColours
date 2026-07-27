const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate, authenticateSupabase } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  syncProfileRules,
} = require('../validations/authValidations');

// POST /api/auth/login
router.post('/login', authLimiter, loginRules, validate, authController.login);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// GET /api/auth/profile
router.get('/profile', authenticate, authController.profile);

// POST /api/auth/refresh
router.post('/refresh', authLimiter, authController.refresh);

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, forgotPasswordRules, validate, authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, resetPasswordRules, validate, authController.resetPassword);

// POST /api/auth/sync-profile  (called by frontend after Google OAuth)
// Requires a valid Supabase token — id and email are read from it, not the body.
router.post('/sync-profile', authenticateSupabase, syncProfileRules, validate, authController.syncProfile);

module.exports = router;
