const express = require('express');
const router = express.Router();

const otpController = require('../controllers/otpController');
const { optionalAuth } = require('../middleware/auth');
const { otpLimiter } = require('../middleware/rateLimiter');

// Phone verification runs before the customer has an account, so none of these
// require auth. optionalAuth is here only so that a customer who IS signed in
// gets the verified number written onto their profile as well.

// POST /api/otp/send   { phone }
router.post('/send', otpLimiter, otpController.sendOtp);

// POST /api/otp/verify { phone, code }
router.post('/verify', otpLimiter, optionalAuth, otpController.verifyOtp);

// GET  /api/otp/status?token=…  — is a stored verification still valid?
router.get('/status', otpController.tokenStatus);

module.exports = router;
