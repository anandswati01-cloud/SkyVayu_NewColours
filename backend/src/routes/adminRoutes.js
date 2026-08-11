const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');
const { success } = require('../utils/response');

// Every route below requires a verified Supabase token belonging to an account
// with profiles.is_admin = true. Checked server-side on each request.
router.use(authenticateAdmin);

// GET /api/admin/me — "is this token an admin?"
//
// Reaching this handler at all is the answer: authenticateAdmin has already
// verified the Supabase token and re-read profiles.is_admin server-side. The
// login screen used to answer that question by querying profiles from the
// browser, which stops working the moment row level security is switched on —
// and never proved anything anyway, since the browser could skip it.
//
// Declared before '/:resource' so it is not swallowed as a resource name.
router.get('/me', (req, res) => success(res, { id: req.user.id, email: req.user.email, role: 'admin' }));

// GET    /api/admin/:resource
router.get('/:resource', adminController.list);

// PATCH  /api/admin/:resource/:id
router.patch('/:resource/:id', adminController.update);

// DELETE /api/admin/:resource/:id
router.delete('/:resource/:id', adminController.remove);

module.exports = router;
