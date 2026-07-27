const express = require('express');
const router = express.Router();

const queryController = require('../controllers/queryController');
const bookingController = require('../controllers/bookingController');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createQueryRules, createBookingRules } = require('../validations/queryValidations');

// ── Queries ────────────────────────────────────────────────────────────────────
// POST /api/queries  — customer submits a query (optional auth: allows guest + logged-in)
router.post('/', optionalAuth, createQueryRules, validate, queryController.createQuery);

// GET /api/queries  — operators and admin list queries
router.get('/', authenticate, queryController.listQueries);

// GET /api/queries/:id  — get one query (optional auth for customer access)
router.get('/:id', optionalAuth, queryController.getQuery);

// PATCH /api/queries/:id  — update status (operator/admin)
router.patch('/:id', authenticate, queryController.updateQuery);

// DELETE /api/queries/:id  — admin only
router.delete('/:id', authenticate, requireRole('admin'), queryController.deleteQuery);

// ── Bookings ───────────────────────────────────────────────────────────────────
// POST /api/bookings — staff-only manual booking. Customers must go through
// /api/payments, which prices from the quote and confirms only after payment.
// This route used to be open with optionalAuth, which let anyone mint a
// 'confirmed' booking at any price they put in the body.
router.post('/bookings', authenticate, createBookingRules, validate, bookingController.createBooking);

// GET /api/bookings
router.get('/bookings', authenticate, bookingController.listBookings);

// GET /api/bookings/:id
router.get('/bookings/:id', authenticate, bookingController.getBooking);

// PUT /api/bookings/:id
router.put('/bookings/:id', authenticate, bookingController.updateBooking);

// DELETE /api/bookings/:id
router.delete('/bookings/:id', authenticate, requireRole('admin'), bookingController.deleteBooking);

module.exports = router;
