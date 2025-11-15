const db = require('../config/database');
const crypto = require('crypto'); // Built-in Node.js module for generating random numbers

// Controller to get the logged-in user's complete profile data
const getProfile = async (req, res) => {
    try {
        // Select all necessary fields, including verification statuses
        const sql = 'SELECT user_id, username, email, phone_number, profile_picture_url, gender, is_phone_verified FROM users WHERE user_id = ?';
        const [users] = await db.query(sql, [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: 'Server error while fetching profile.' });
    }
};

// Controller to update the user's text-based profile info
const updateProfile = async (req, res) => {
    try {
        const { username, phone_number, gender } = req.body;
        if (!username || !gender) {
            return res.status(400).json({ message: 'Username and gender are required.' });
        }

        // Validate phone number format if provided
        if (phone_number) {
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(phone_number)) {
                return res.status(400).json({ message: 'Please enter a valid 10-digit Indian phone number.' });
            }
        }

        // When a user updates their phone number, their verification status should be reset
        const sql = 'UPDATE users SET username = ?, phone_number = ?, gender = ?, is_phone_verified = FALSE WHERE user_id = ?';
        await db.query(sql, [username, phone_number || null, gender, req.user.id]);
        res.status(200).json({ message: 'Profile updated successfully. Please re-verify your new phone number.' });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: 'Server error while updating profile.' });
    }
};

// Controller to handle profile picture upload
const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file was uploaded.' });
        }
        // The path where the file is stored by multer
        const imageUrl = `/uploads/profile-pictures/${req.file.filename}`;

        const sql = 'UPDATE users SET profile_picture_url = ? WHERE user_id = ?';
        await db.query(sql, [imageUrl, req.user.id]);

        res.status(200).json({ message: 'Profile picture uploaded successfully.', imageUrl: imageUrl });
    } catch (error) {
        console.error("Upload Picture Error:", error);
        res.status(500).json({ message: 'Server error while uploading picture.' });
    }
};

// Controller to send a verification OTP to the user's phone (simulated)
const sendPhoneOtp = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { phone_number } = req.body; // Get the new phone number from the request

        // Validate the new phone number
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone_number)) {
            return res.status(400).json({ message: 'Invalid phone number format.' });
        }
        
        const otp = crypto.randomInt(100000, 999999).toString();
        const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update the user's record with the new phone number and the OTP, resetting verification status
        await db.query('UPDATE users SET phone_number = ?, phone_verification_otp = ?, phone_otp_expires_at = ?, is_phone_verified = FALSE WHERE user_id = ?', [phone_number, otp, otp_expires_at, user_id]);

        // SIMULATION MODE: Log the OTP to the console
        console.log(`SIMULATING SENDING PHONE OTP: ${otp} to phone number ${phone_number}`);
        
        res.status(200).json({ message: 'OTP sent successfully (check console).' });
    } catch (error) {
        console.error('Send Phone OTP Error:', error);
        res.status(500).json({ message: 'Failed to send OTP.' });
    }
};

// Controller to verify the phone OTP
const verifyPhoneOtp = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { otp } = req.body;

        const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        
        const user = users[0];
        if (user.phone_verification_otp !== otp || new Date() > new Date(user.phone_otp_expires_at)) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        await db.query('UPDATE users SET is_phone_verified = TRUE, phone_verification_otp = NULL, phone_otp_expires_at = NULL WHERE user_id = ?', [user_id]);

        res.status(200).json({ message: 'Phone number verified successfully!' });
    } catch (error) {
        console.error('Verify Phone OTP Error:', error);
        res.status(500).json({ message: 'Failed to verify OTP.' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    uploadProfilePicture,
    sendPhoneOtp,
    verifyPhoneOtp
};

