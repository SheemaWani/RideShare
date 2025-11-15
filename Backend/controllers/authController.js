const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // Built-in Node.js module for generating random numbers

// --- Nodemailer Transporter Setup ---
// This configures the email service that will send your OTPs.
// It uses the credentials stored securely in your .env file.
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // false for port 587 (TLS), true for 465 (SSL)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- SIGNUP LOGIC (SENDS EMAIL OTP) ---
const signup = async (req, res) => {
    try {
        const { username, email, password, gender, phone_number } = req.body;
        if (!username || !email || !password || !gender) {
            return res.status(400).json({ message: 'Please provide all required fields.' });
        }

        // 1. Enforce Password Strength Policy on the server
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long and include an uppercase letter, a number, and a special character.' });
        }

        // 2. Validate phone number format if provided
        if (phone_number) {
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(phone_number)) {
                return res.status(400).json({ message: 'Please enter a valid 10-digit Indian phone number.' });
            }
        }

        // 3. Check if a user with that email already exists
        const [existingUsers] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        // 4. Hash the password securely
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        
        // 5. Generate a 6-digit email OTP and set its expiration time
        const otp = crypto.randomInt(100000, 999999).toString();
        const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 6. Insert the new user into the database
        const sql = 'INSERT INTO users (username, email, password_hash, gender, phone_number, email_verification_otp, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
        await db.query(sql, [username, email, password_hash, gender, phone_number || null, otp, otp_expires_at]);

        // 7. Send the OTP email to the user
        try {
            await transporter.sendMail({
                from: `"RideShare" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your RideShare Verification Code',
                html: `<p>Your verification code is: <b>${otp}</b>. It will expire in 10 minutes.</p>`,
            });
        } catch (emailError) {
            console.error('Email Sending Error:', emailError);
            return res.status(500).json({ message: 'User registered, but could not send verification email. Please check server logs.' });
        }

        res.status(201).json({ message: `A verification code has been sent to ${email}. Please check your inbox.` });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: 'An error occurred during registration.' });
    }
};

// --- VERIFY EMAIL LOGIC ---
const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const user = users[0];

        if (user.email_verification_otp !== otp || new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' });
        }

        const sql = 'UPDATE users SET is_email_verified = TRUE, email_verification_otp = NULL, otp_expires_at = NULL WHERE user_id = ?';
        await db.query(sql, [user.user_id]);

        res.status(200).json({ message: 'Email verified successfully! You can now log in.' });

    } catch (error) {
        console.error('Verify Email Error:', error);
        res.status(500).json({ message: 'An error occurred during verification.' });
    }
};

// --- LOGIN LOGIC (CHECKS FOR VERIFICATION) ---
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide both email and password.' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const user = users[0];

        if (!user.is_email_verified) {
            return res.status(403).json({ message: 'Your email is not verified. Please check your inbox for the OTP.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const payload = { user: { id: user.user_id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.status(200).json({ token });
            }
        );

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
};

// --- PHONE OTP SENDING LOGIC (SIMULATED) ---
const sendPhoneOtp = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { phone_number } = req.body;

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone_number)) {
            return res.status(400).json({ message: 'Invalid phone number format.' });
        }
        
        const otp = crypto.randomInt(100000, 999999).toString();
        const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

        await db.query('UPDATE users SET phone_number = ?, phone_verification_otp = ?, phone_otp_expires_at = ? WHERE user_id = ?', [phone_number, otp, otp_expires_at, user_id]);

        // In a real app, you would send an SMS here. For now, we log to the console.
        console.log(`SIMULATING SENDING PHONE OTP: ${otp} to phone number ${phone_number}`);
        
        res.status(200).json({ message: 'OTP sent successfully (check console).' });
    } catch (error) {
        console.error('Send Phone OTP Error:', error);
        res.status(500).json({ message: 'Failed to send OTP.' });
    }
};

// --- PHONE OTP VERIFICATION LOGIC ---
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
    signup,
    verifyEmail,
    login,
    sendPhoneOtp,
    verifyPhoneOtp
};

