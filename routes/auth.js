// backend/routes/auth.js
const express = require('express');
const { register, login } = require('../controllers/authController');  // Updated to include login controller
const router = express.Router();

// Route: POST /api/auth/register
// Desc:  Register a new user
// Access: Public
router.post('/register', register);

router.post('/login', login);  // Added login route

module.exports = router;
