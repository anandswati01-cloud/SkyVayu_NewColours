const express = require('express');
const router = express.Router();

const fleetController = require('../controllers/fleetController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

const addAircraftRules = [
  body('aircraftType').notEmpty().withMessage('Aircraft type is required.').trim(),
  body('registration').notEmpty().withMessage('Registration is required.').trim().toUpperCase(),
  body('seatsAvailable').optional().isInt({ min: 1 }).withMessage('seatsAvailable must be a positive integer.'),
];

// GET /api/fleet
router.get('/', authenticate, fleetController.listFleet);

// GET /api/fleet/:id
router.get('/:id', authenticate, fleetController.getAircraft);

// POST /api/fleet
router.post('/', authenticate, addAircraftRules, validate, fleetController.addAircraft);

// PUT /api/fleet/:id
router.put('/:id', authenticate, fleetController.updateAircraft);

// DELETE /api/fleet/:id
router.delete('/:id', authenticate, fleetController.deleteAircraft);

// PATCH /api/fleet/:id/status — admin only
router.patch('/:id/status', authenticate, requireRole('admin'), fleetController.updateDocStatus);

module.exports = router;
