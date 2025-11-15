const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Import all the controller functions for user profile management
const { 
    getProfile, 
    updateProfile, 
    uploadProfilePicture,
    sendPhoneOtp,
    verifyPhoneOtp
} = require('../controllers/userController');

// Configure multer for file storage
// This sets up where to save uploaded files and how to name them uniquely.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // The folder where profile pictures will be saved.
        // Ensure this folder exists: backend/uploads/profile-pictures/
        cb(null, 'uploads/profile-pictures/'); 
    },
    filename: (req, file, cb) => {
        // Creates a unique filename to prevent overwrites: userId-timestamp.extension
        const uniqueSuffix = req.user.id + '-' + Date.now() + path.extname(file.originalname);
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ storage: storage });

// @route   GET /api/user/profile
// @desc    Get the logged-in user's profile information
// @access  Private
router.get('/profile', authMiddleware, getProfile);

// @route   PUT /api/user/profile
// @desc    Update the logged-in user's profile information
// @access  Private
router.put('/profile', authMiddleware, updateProfile);

// @route   POST /api/user/profile-picture
// @desc    Upload a new profile picture for the logged-in user
// @access  Private
// The 'upload.single()' part is multer middleware that processes the uploaded file.
router.post('/profile-picture', authMiddleware, upload.single('profilePicture'), uploadProfilePicture);

// @route   POST /api/user/send-phone-otp
// @desc    Send a verification OTP to the user's phone number (simulated)
// @access  Private
router.post('/send-phone-otp', authMiddleware, sendPhoneOtp);

// @route   POST /api/user/verify-phone-otp
// @desc    Verify the phone OTP submitted by the user
// @access  Private
router.post('/verify-phone-otp', authMiddleware, verifyPhoneOtp);

module.exports = router;

