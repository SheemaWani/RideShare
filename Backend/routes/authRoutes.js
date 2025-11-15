const express = require('express');
const router = express.Router();

// Import the controller functions that will handle the logic for each route
const { signup, verifyEmail, login } = require('../controllers/authController');

// @route   POST /api/auth/signup
// @desc    Register a new user and send a verification OTP
// @access  Public
router.post('/signup', signup);

// @route   POST /api/auth/verify-email
// @desc    Verify a user's email account with the provided OTP
// @access  Public
router.post('/verify-email', verifyEmail);

// @route   POST /api/auth/login
// @desc    Log in a verified user and return a JSON Web Token (JWT)
// @access  Public
router.post('/login', login);

module.exports = router;

