const express = require('express');
const router = express.Router();

const feedbackController = require('../controllers/feedbackController');
const { authenticate, requireRole } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const feedbackRules = [
  body('message').notEmpty().withMessage('Message is required.').trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
];

const newsletterRules = [
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
];

const contactRules = [
  body('name').notEmpty().withMessage('Name is required.').trim(),
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('message').notEmpty().withMessage('Message is required.').trim(),
];

// POST /api/feedback
router.post('/', feedbackRules, validate, feedbackController.submitFeedback);

// GET /api/feedback — admin only
router.get('/', authenticate, requireRole('admin'), feedbackController.listFeedback);

// DELETE /api/feedback/:id — admin only
router.delete('/:id', authenticate, requireRole('admin'), feedbackController.deleteFeedback);

// POST /api/feedback/newsletter
router.post('/newsletter', newsletterRules, validate, feedbackController.subscribeNewsletter);

// POST /api/feedback/contact
router.post('/contact', contactRules, validate, feedbackController.submitContact);

module.exports = router;
