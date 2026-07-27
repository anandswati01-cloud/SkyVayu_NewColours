const { body } = require('express-validator');

const createQueryRules = [
  body('tripType')
    .isIn(['one_way', 'round_trip', 'multiple_sectors'])
    .withMessage('tripType must be one_way, round_trip, or multiple_sectors.'),
  body('passengers')
    .isInt({ min: 1, max: 100 })
    .withMessage('passengers must be between 1 and 100.'),
  body('clientPhone')
    .optional()
    .matches(/^[\d\s+\-()+]{7,20}$/)
    .withMessage('Invalid phone number.'),
  body('aircraftCategory')
    .optional()
    .isIn(['fixed_wing', 'helicopter', 'turboprop'])
    .withMessage('Invalid aircraft category.'),
];

const createBookingRules = [
  body('clientName').notEmpty().withMessage('Client name is required.').trim(),
  body('clientEmail').isEmail().withMessage('A valid client email is required.').normalizeEmail(),
  body('clientPhone')
    .matches(/^[\d\s+\-()+]{7,20}$/)
    .withMessage('Invalid phone number.'),
  body('operatorName').notEmpty().withMessage('Operator name is required.').trim(),
  body('totalAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number.'),
];

module.exports = { createQueryRules, createBookingRules };
