const express = require('express');
const router = express.Router();

const operatorController = require('../controllers/operatorController');
const { authenticate, requireRole } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const registerRules = [
  body('companyName').notEmpty().withMessage('Company name is required.').trim(),
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('ownerUsername').notEmpty().withMessage('Owner username is required.').trim(),
  body('ownerPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('aircraftCategory')
    .optional()
    .isIn(['fixed_wing', 'helicopter', 'turboprop'])
    .withMessage('Invalid aircraft category.'),
];

// POST /api/operators — public registration
router.post('/', registerRules, validate, operatorController.registerOperator);

// GET /api/operators — admin only
router.get('/', authenticate, requireRole('admin'), operatorController.listOperators);

// GET /api/operators/:id
router.get('/:id', authenticate, operatorController.getOperator);

// PUT /api/operators/:id
router.put('/:id', authenticate, operatorController.updateOperator);

// PATCH /api/operators/:id/approval — admin only
router.patch('/:id/approval', authenticate, requireRole('admin'), operatorController.setApprovalStatus);

// ── Employee management ────────────────────────────────────────────────────────

// GET /api/operators/:id/users
router.get('/:id/users', authenticate, operatorController.listUsers);

// POST /api/operators/:id/users
router.post('/:id/users', authenticate, operatorController.addUser);

// PATCH /api/operators/:id/users/:uid
router.patch('/:id/users/:uid', authenticate, operatorController.updateUser);

// DELETE /api/operators/:id/users/:uid
router.delete('/:id/users/:uid', authenticate, operatorController.removeUser);

module.exports = router;
