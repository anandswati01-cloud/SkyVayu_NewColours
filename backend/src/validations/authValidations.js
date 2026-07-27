const { body } = require('express-validator');

const loginRules = [
  body('username').notEmpty().withMessage('Username or email is required.').trim(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordRules = [
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
];

// id and email are taken from the verified token, so the body only carries an
// optional display name.
const syncProfileRules = [
  body('fullName').optional({ values: 'falsy' }).isString().trim(),
];

module.exports = { loginRules, forgotPasswordRules, resetPasswordRules, syncProfileRules };
