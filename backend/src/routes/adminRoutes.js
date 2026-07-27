const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

// Every route below requires a verified Supabase token belonging to an account
// with profiles.is_admin = true. Checked server-side on each request.
router.use(authenticateAdmin);

// GET    /api/admin/:resource
router.get('/:resource', adminController.list);

// PATCH  /api/admin/:resource/:id
router.patch('/:resource/:id', adminController.update);

// DELETE /api/admin/:resource/:id
router.delete('/:resource/:id', adminController.remove);

module.exports = router;
