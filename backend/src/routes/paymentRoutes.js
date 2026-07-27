const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');
const { optionalAuth } = require('../middleware/auth');

// POST /api/payments/order  — open a Razorpay order for a quote (price from DB)
router.post('/order', optionalAuth, paymentController.createOrder);

// POST /api/payments/verify — verify the checkout callback and confirm booking
router.post('/verify', optionalAuth, paymentController.verifyPayment);

module.exports = router;
