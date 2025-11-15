const db = require('../config/database');
const nodemailer = require('nodemailer');

// Configure the email transporter using credentials from your .env file
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // false for port 587 (TLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- CREATE BOOKING LOGIC ---
const createBooking = async (req, res) => {
    const passenger_id = req.user.id;
    const { ride_id } = req.body;

    if (!ride_id) {
        return res.status(400).json({ message: 'Ride ID is required.' });
    }

    const connection = await db.getConnection(); // Get a connection for the transaction

    try {
        await connection.beginTransaction(); // Start the transaction

        // 1. Get all necessary info and lock the ride row for update
        const [rides] = await connection.query('SELECT r.*, d.email as driver_email, d.username as driver_name FROM rides r JOIN users d ON r.driver_id = d.user_id WHERE r.ride_id = ? FOR UPDATE', [ride_id]);
        const [passengers] = await connection.query('SELECT username, gender FROM users WHERE user_id = ?', [passenger_id]);
        
        if (rides.length === 0) throw new Error('Ride not found.');
        const ride = rides[0];
        const passenger = passengers[0];
        
        // 2. Perform all validation checks
        if (ride.driver_id === passenger_id) throw new Error('You cannot book your own ride.');
        if (ride.available_seats < 1) throw new Error('This ride is already full.');
        if (ride.is_female_only && passenger.gender !== 'female') throw new Error('Sorry, this is a female-only ride.');

        // --- THIS IS THE KEY UPDATE ---
        // Check for ANY booking for this user and ride, regardless of status.
        const [existingBookings] = await connection.query("SELECT * FROM bookings WHERE ride_id = ? AND passenger_id = ?", [ride_id, passenger_id]);
        
        if (existingBookings.length > 0) {
            const existingBooking = existingBookings[0];
            // If the booking is already confirmed, throw an error.
            if (existingBooking.booking_status === 'confirmed') {
                throw new Error('You have already booked this ride.');
            }
            // If the booking was cancelled, reactivate it instead of creating a new one.
            else if (existingBooking.booking_status === 'cancelled') {
                await connection.query("UPDATE bookings SET booking_status = 'confirmed' WHERE booking_id = ?", [existingBooking.booking_id]);
            }
        } else {
            // If no booking has ever existed, create a new one.
            await connection.query('INSERT INTO bookings (ride_id, passenger_id, seats_booked) VALUES (?, ?, ?)', [ride_id, passenger_id, 1]);
        }

        // 3. Update the database (This now runs for both new and reactivated bookings)
        await connection.query('UPDATE rides SET available_seats = available_seats - 1 WHERE ride_id = ?', [ride_id]);
        
        await connection.commit(); // Finalize the transaction

        // 4. Send notification email to the driver
        try {
            await transporter.sendMail({
                from: `"RideShare" <${process.env.EMAIL_USER}>`,
                to: ride.driver_email,
                subject: 'You have a new booking!',
                html: `<p>Hi ${ride.driver_name}, <b>${passenger.username}</b> has booked a seat on your ride from <b>${ride.origin}</b> to <b>${ride.destination}</b>.</p>`,
            });
        } catch (emailError) {
            console.error("Failed to send booking notification to driver:", emailError);
        }

        res.status(201).json({ message: 'Booking successful! View your ride in the dashboard.' });

    } catch (error) {
        await connection.rollback(); // Undo all changes if any step fails
        res.status(400).json({ message: error.message || 'An error occurred during booking.' });
    } finally {
        connection.release(); // Always release the connection
    }
};

// --- CANCEL BOOKING LOGIC ---
const cancelBooking = async (req, res) => {
    const passenger_id = req.user.id;
    const { booking_id } = req.params;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Find the booking and ensure the current user is the one who made it
        const [bookings] = await connection.query('SELECT * FROM bookings WHERE booking_id = ? AND passenger_id = ? AND booking_status = "confirmed" FOR UPDATE', [booking_id, passenger_id]);
        if (bookings.length === 0) {
            throw new Error('Booking not found or you do not have permission to cancel it.');
        }
        const booking = bookings[0];

        // Mark the booking as cancelled
        await connection.query('UPDATE bookings SET booking_status = "cancelled" WHERE booking_id = ?', [booking_id]);
        
        // Add the seat(s) back to the ride's available seats
        await connection.query('UPDATE rides SET available_seats = available_seats + ? WHERE ride_id = ?', [booking.seats_booked, booking.ride_id]);

        await connection.commit();
        res.status(200).json({ message: 'Booking cancelled successfully.' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message || 'Could not cancel booking.' });
    } finally {
        connection.release();
    }
};

module.exports = {
    createBooking,
    cancelBooking,
};

