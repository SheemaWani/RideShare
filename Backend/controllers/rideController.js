const db = require('../config/database');
const fakeChallanData = require('../fakeChallanData.json'); // Import the fake challan database

// Controller function to publish a new ride
const publishRide = async (req, res) => {
    try {
        const driver_id = req.user.id;
        const { origin, destination, departure_time, available_seats, price_per_seat, is_female_only } = req.body;

        if (!origin || !destination || !departure_time || !available_seats || !price_per_seat) {
            return res.status(400).json({ message: 'Please provide all ride details.' });
        }

        // Check for overlapping rides for the same driver
        const rideBufferHours = 2;
        const checkOverlapSql = `
            SELECT ride_id FROM rides 
            WHERE driver_id = ? 
            AND status = 'scheduled'
            AND departure_time BETWEEN DATE_SUB(?, INTERVAL ? HOUR) AND DATE_ADD(?, INTERVAL ? HOUR)
        `;
        const [overlappingRides] = await db.query(checkOverlapSql, [driver_id, departure_time, rideBufferHours, departure_time, rideBufferHours]);

        if (overlappingRides.length > 0) {
            return res.status(409).json({ message: `You already have a ride scheduled around this time.` });
        }
        
        const vehicleQuery = 'SELECT vehicle_id FROM vehicles WHERE owner_id = ? LIMIT 1';
        const [vehicles] = await db.query(vehicleQuery, [driver_id]);
        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'No vehicle found. Please register a vehicle first.' });
        }
        const vehicle_id = vehicles[0].vehicle_id;

        const sql = 'INSERT INTO rides (driver_id, vehicle_id, origin, destination, departure_time, available_seats, price_per_seat, is_female_only) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [driver_id, vehicle_id, origin, destination, departure_time, available_seats, price_per_seat, is_female_only || false];
        
        await db.query(sql, values);
        res.status(201).json({ message: 'Ride published successfully!' });
    } catch (error) {
        console.error('Publish Ride Error:', error);
        res.status(500).json({ message: 'An error occurred while publishing the ride.' });
    }
};

// Controller function for searching rides with challan simulation
const searchRides = async (req, res) => {
    try {
        const { origin, destination } = req.query;

        let sql = `
            SELECT 
                r.ride_id, r.origin, r.destination, r.departure_time, 
                r.available_seats, r.price_per_seat, r.is_female_only,
                u.user_id as driver_id, u.username AS driver_name, u.gender AS driver_gender, 
                u.profile_picture_url,
                v.model AS vehicle_model, v.registration_number
            FROM rides AS r
            JOIN users AS u ON r.driver_id = u.user_id
            JOIN vehicles AS v ON r.vehicle_id = v.vehicle_id
            WHERE 
                r.departure_time > NOW() AND 
                r.available_seats > 0 AND
                r.status = 'scheduled'
        `;
        const params = [];

        if (origin && destination) {
            sql += ' AND r.origin LIKE ? AND r.destination LIKE ?';
            params.push(`%${origin}%`, `%${destination}%`);
        }

        sql += ' ORDER BY r.departure_time ASC';
        
        const [rides] = await db.query(sql, params);

        // For each ride, perform the simulated challan check
        const ridesWithChallanStatus = rides.map(ride => {
            const challanInfo = fakeChallanData[ride.registration_number];
            let challanStatus;
            if (challanInfo) {
                challanStatus = { ...challanInfo, status: challanInfo.challanCount > 0 ? "warning" : "success" };
            } else {
                challanStatus = {
                    status: "success",
                    challanCount: 0,
                    message: `No pending challans found for ${ride.registration_number}.`,
                };
            }
            return { ...ride, challanStatus }; // Attach the challan info to the ride object
        });
        
        res.status(200).json(ridesWithChallanStatus);

    } catch (error) {
        console.error('Search Rides Error:', error);
        res.status(500).json({ message: 'An error occurred while searching for rides.' });
    }
};

// Controller to get rides published by the logged-in user
const getMyPublishedRides = async (req, res) => {
    try {
        const driver_id = req.user.id;
        const ridesSql = "SELECT * FROM rides WHERE driver_id = ? AND status = 'scheduled' ORDER BY departure_time DESC";
        const [rides] = await db.query(ridesSql, [driver_id]);

        for (let ride of rides) {
            const passengersSql = `
                SELECT u.username, u.profile_picture_url 
                FROM bookings b
                JOIN users u ON b.passenger_id = u.user_id
                WHERE b.ride_id = ? AND b.booking_status = 'confirmed'
            `;
            const [passengers] = await db.query(passengersSql, [ride.ride_id]);
            ride.passengers = passengers;
        }

        res.status(200).json(rides);
    } catch (error) {
        console.error('Get My Published Rides Error:', error);
        res.status(500).json({ message: 'An error occurred while fetching your published rides.' });
    }
};

// Controller to get rides booked by the logged-in user
const getMyBookedRides = async (req, res) => {
    try {
        const passenger_id = req.user.id;
        const sql = `
            SELECT 
                r.ride_id, r.origin, r.destination, r.departure_time, r.price_per_seat,
                b.booking_id, b.seats_booked,
                driver.username AS driver_name,
                driver.phone_number AS driver_contact,
                driver.profile_picture_url
            FROM bookings AS b
            JOIN rides AS r ON b.ride_id = r.ride_id
            JOIN users AS driver ON r.driver_id = driver.user_id
            WHERE b.passenger_id = ? AND b.booking_status = 'confirmed'
            ORDER BY r.departure_time ASC;
        `;
        const [bookedRides] = await db.query(sql, [passenger_id]);
        res.status(200).json(bookedRides);
    } catch (error) {
        console.error('Get My Booked Rides Error:', error);
        res.status(500).json({ message: 'An error occurred while fetching your booked rides.' });
    }
};

// Controller to cancel a published ride
const cancelRide = async (req, res) => {
    const driver_id = req.user.id;
    const { ride_id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [rides] = await connection.query("SELECT * FROM rides WHERE ride_id = ? AND driver_id = ? AND status = 'scheduled' FOR UPDATE", [ride_id, driver_id]);
        if (rides.length === 0) {
            throw new Error('Ride not found or you do not have permission to cancel it.');
        }

        await connection.query('UPDATE rides SET status = "cancelled" WHERE ride_id = ?', [ride_id]);
        await connection.query('UPDATE bookings SET booking_status = "cancelled" WHERE ride_id = ?', [ride_id]);

        await connection.commit();
        res.status(200).json({ message: 'Ride and all associated bookings have been cancelled.' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message || 'Could not cancel ride.' });
    } finally {
        connection.release();
    }
};

module.exports = {
    publishRide,
    searchRides,
    getMyPublishedRides,
    getMyBookedRides,
    cancelRide,
};

