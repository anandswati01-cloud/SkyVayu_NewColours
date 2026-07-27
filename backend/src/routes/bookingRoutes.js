const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBookingRules } = require('../validations/queryValidations');

// POST /api/bookings — staff-only manual booking. Customers must go through
// /api/payments, which prices from the quote and confirms only after payment.
// This was open with optionalAuth, which let anyone mint a 'confirmed' booking
// at any price they put in the request body.
router.post('/', authenticate, createBookingRules, validate, bookingController.createBooking);

// GET /api/bookings
router.get('/', authenticate, bookingController.listBookings);

// GET /api/bookings/:id
router.get('/:id', authenticate, bookingController.getBooking);

// PUT /api/bookings/:id
router.put('/:id', authenticate, bookingController.updateBooking);

// DELETE /api/bookings/:id
router.delete('/:id', authenticate, requireRole('admin'), bookingController.deleteBooking);

module.exports = router;
