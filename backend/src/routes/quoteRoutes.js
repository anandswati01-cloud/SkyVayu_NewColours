const express = require('express');
const router = express.Router();

const quoteController = require('../controllers/quoteController');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

const createQuoteRules = [
  body('queryId').notEmpty().withMessage('queryId is required.'),
  body('baseCharge').isFloat({ min: 0 }).withMessage('baseCharge must be a positive number.'),
];

// POST /api/quotes/claim — must be before /:id routes
router.post('/claim', authenticate, quoteController.claimQuery);

// DELETE /api/quotes/claims/:claimId
router.delete('/claims/:claimId', authenticate, quoteController.releaseClaim);

// POST /api/quotes
router.post('/', authenticate, createQuoteRules, validate, quoteController.createQuote);

// GET /api/quotes — customers/guests read shared quotes for their query
// (queryId acts as the capability); operators get their own scoped view.
router.get('/', optionalAuth, quoteController.listQuotes);

// GET /api/quotes/:id
router.get('/:id', authenticate, quoteController.getQuote);

// PATCH /api/quotes/:id
router.patch('/:id', authenticate, quoteController.updateQuote);

// DELETE /api/quotes/:id
router.delete('/:id', authenticate, quoteController.deleteQuote);

module.exports = router;
