const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate, authenticateSupabase, authenticateAny } = require('../middleware/auth');
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
//
// Operators and customers both land here and get their own shape back.
// authenticateAny because a customer arrives with a Supabase token, which plain
// `authenticate` rejects — the customer branch of the handler existed but was
// unreachable, which is why the profile page could never load anything.
router.get('/profile', authenticateAny, authController.profile);

// PATCH /api/auth/profile — customer edits their own phone and KYC details.
// The handler whitelists the columns; kyc_verified and is_admin are not among
// them.
router.patch('/profile', authenticateSupabase, authController.updateProfile);

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
