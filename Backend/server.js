const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE SETUP ---
// Enable Cross-Origin Resource Sharing to allow your frontend to communicate with this backend
app.use(cors());
// Parse incoming JSON request bodies
app.use(express.json());
// Serve uploaded files (like profile pictures) statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- IMPORT ALL ROUTE FILES ---
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

// --- CONNECT ROUTES TO THE APPLICATION ---
// Any request starting with /api/auth will be handled by authRoutes
app.use('/api/auth', authRoutes);
// Any request starting with /api/rides will be handled by rideRoutes
app.use('/api/rides', rideRoutes);
// Any request starting with /api/vehicles will be handled by vehicleRoutes
app.use('/api/vehicles', vehicleRoutes);
// Any request starting with /api/user will be handled by userRoutes
app.use('/api/user', userRoutes);
// Any request starting with /api/bookings will be handled by bookingRoutes
app.use('/api/bookings', bookingRoutes);

// A simple root route to check if the server is running
app.get('/', (req, res) => {
    res.send('Welcome to the RideShare API Server!');
});

// --- START THE SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

