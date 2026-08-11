const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');
const { optionalAuth, authenticateAdmin } = require('../middleware/auth');

// Note: POST /api/payments/webhook is NOT mounted here. It needs the raw request
// body to verify its signature, so app.js registers it ahead of the JSON body
// parser. See paymentController.webhook.

// ── Customer ─────────────────────────────────────────────────────────────────
// POST /api/payments/order  — open a Razorpay order for a quote (price from DB)
router.post('/order', optionalAuth, paymentController.createOrder);

// POST /api/payments/verify — verify the checkout callback and confirm booking
router.post('/verify', optionalAuth, paymentController.verifyPayment);

// ── Admin ────────────────────────────────────────────────────────────────────
// Both of these move real money or real booking state, so they sit behind the
// server-side admin check rather than the optional auth the customer flow uses.

// POST /api/payments/refund              — refund a booking, fully or partially
router.post('/refund', authenticateAdmin, paymentController.refund);

// POST /api/payments/reconcile/:bookingId — ask Razorpay to settle a stuck booking
router.post('/reconcile/:bookingId', authenticateAdmin, paymentController.reconcile);

// POST /api/payments/dismiss/:bookingId   — write off an unpaid booking. Refused
// by the controller if Razorpay reports the money as captured.
router.post('/dismiss/:bookingId', authenticateAdmin, paymentController.dismiss);

module.exports = router;
