const express = require('express');
const router = express.Router();

const queryController = require('../controllers/queryController');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createQueryRules } = require('../validations/queryValidations');

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
// Booking routes used to be duplicated here as well, which mounted a second copy
// of every one of them under /api/queries/bookings — a parallel, easily missed
// entrance to the same handlers. They now live only in routes/bookingRoutes.js,
// mounted at /api/bookings. Do not add them back here.

module.exports = router;
