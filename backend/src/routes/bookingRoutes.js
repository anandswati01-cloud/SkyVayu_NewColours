const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');
const { authenticate, authenticateAny, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBookingRules } = require('../validations/queryValidations');

// These routes are defined here and ONLY here. They were previously duplicated
// in queryRoutes.js, which mounted a second, separate copy under
// /api/queries/bookings — so tightening one file left the other wide open.

// POST /api/bookings — offline/phone booking, created by staff.
// Mints a 'confirmed' booking at whatever price is in the body with no payment
// behind it, so it is admin-only. An operator reaching this could confirm their
// own bookings for free.
router.post('/', authenticate, requireRole('admin'), createBookingRules, validate, bookingController.createBooking);

// GET /api/bookings — customers, operators and admins all use this; the
// controller scopes the result to whichever of the three the caller is.
// authenticateAny because a customer arrives with a Supabase token, which
// `authenticate` rejects outright — that is why customers saw no bookings.
router.get('/', authenticateAny, bookingController.listBookings);

// GET /api/bookings/:id — same three audiences, ownership checked in the controller.
router.get('/:id', authenticateAny, bookingController.getBooking);

// PUT /api/bookings/:id — admin only, and cannot touch status or total_amount.
// Those belong to the payment flow; see the note on bookingController.updateBooking.
router.put('/:id', authenticate, requireRole('admin'), bookingController.updateBooking);

// DELETE /api/bookings/:id
router.delete('/:id', authenticate, requireRole('admin'), bookingController.deleteBooking);

module.exports = router;
