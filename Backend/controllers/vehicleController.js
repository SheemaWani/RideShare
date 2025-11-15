const db = require('../config/database');
const crypto = require('crypto');
const fakeChallanData = require('../fakeChallanData.json');

// Controller to add a new vehicle
const addVehicle = async (req, res) => {
    try {
        const owner_id = req.user.id;
        let { model, registration_number } = req.body;

        if (!model || !registration_number) {
            return res.status(400).json({ message: 'Model and registration number are required.' });
        }

        const registrationRegex = /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{1,4}$/i;
        if (!registrationRegex.test(registration_number)) {
            return res.status(400).json({ message: 'Invalid registration number format. Please use a valid format (e.g., DL01AB1234).' });
        }
        
        const normalizedRegNumber = registration_number.toUpperCase().replace(/[ -]/g, '');

        const sql = 'INSERT INTO vehicles (owner_id, model, registration_number) VALUES (?, ?, ?)';
        await db.query(sql, [owner_id, model, normalizedRegNumber]);

        res.status(201).json({ message: 'Vehicle added successfully!' });
    } catch (error) {
        console.error('Add Vehicle Error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'This registration number is already in use.' });
        }
        res.status(500).json({ message: 'An error occurred while adding the vehicle.' });
    }
};

// Controller to get all vehicles owned by the logged-in user
const getMyVehicles = async (req, res) => {
    try {
        const owner_id = req.user.id;
        const sql = 'SELECT vehicle_id, model, registration_number, is_verified FROM vehicles WHERE owner_id = ?';
        const [vehicles] = await db.query(sql, [owner_id]);
        res.status(200).json(vehicles);
    } catch (error) {
        console.error('Get My Vehicles Error:', error);
        res.status(500).json({ message: 'An error occurred while fetching your vehicles.' });
    }
};

// Controller to dynamically cancel associated rides before deleting a vehicle
const deleteVehicle = async (req, res) => {
    const owner_id = req.user.id;
    const { id } = req.params; // Get vehicle_id from the URL
    const connection = await db.getConnection(); // Use a connection for the transaction

    try {
        await connection.beginTransaction();

        // 1. Find all FUTURE scheduled rides for this vehicle.
        const futureRideCheckSql = "SELECT ride_id FROM rides WHERE vehicle_id = ? AND status = 'scheduled' AND departure_time > NOW()";
        const [futureRides] = await connection.query(futureRideCheckSql, [id]);

        if (futureRides.length > 0) {
            const rideIdsToCancel = futureRides.map(r => r.ride_id);
            
            // 2. Cancel all bookings associated with those future rides.
            await connection.query("UPDATE bookings SET booking_status = 'cancelled' WHERE ride_id IN (?)", [rideIdsToCancel]);
            
            // 3. Cancel the future rides themselves.
            await connection.query("UPDATE rides SET status = 'cancelled' WHERE ride_id IN (?)", [rideIdsToCancel]);
        }
        
        // 4. Clean up any links from PAST rides
        const pastRidesSql = "SELECT ride_id FROM rides WHERE vehicle_id = ? AND departure_time <= NOW()";
        const [pastRides] = await connection.query(pastRidesSql, [id]);
        if (pastRides.length > 0) {
            const pastRideIds = pastRides.map(r => r.ride_id);
            await connection.query("DELETE FROM bookings WHERE ride_id IN (?)", [pastRideIds]);
            await connection.query("DELETE FROM rides WHERE ride_id IN (?)", [pastRideIds]);
        }

        // 5. Now that all dependencies are handled, safely delete the vehicle.
        const deleteVehicleSql = 'DELETE FROM vehicles WHERE vehicle_id = ? AND owner_id = ?';
        const [result] = await connection.query(deleteVehicleSql, [id, owner_id]);

        if (result.affectedRows === 0) {
            // This can happen if the vehicle didn't exist, which is fine.
            // We proceed without error.
        }

        await connection.commit();
        res.status(200).json({ message: 'Vehicle and its ride history have been successfully deleted/cancelled.' });

    } catch (error) {
        await connection.rollback();
        console.error('Delete Vehicle Error:', error);
        res.status(400).json({ message: error.message || 'An error occurred while deleting the vehicle.' });
    } finally {
        connection.release();
    }
};

// Controller to "verify" a vehicle (simulated)
const verifyVehicle = async (req, res) => {
    try {
        const owner_id = req.user.id;
        const { vehicle_id } = req.params;
        const { owner_name } = req.body;

        if (!owner_name) {
            return res.status(400).json({ message: "Owner's name is required for verification." });
        }

        console.log(`Simulating verification for vehicle ID: ${vehicle_id} with owner name: ${owner_name}`);
        
        const sql = 'UPDATE vehicles SET is_verified = TRUE WHERE vehicle_id = ? AND owner_id = ?';
        await db.query(sql, [vehicle_id, owner_id]);

        res.status(200).json({ message: 'Vehicle verification submitted successfully!' });

    } catch (error) {
        console.error('Verify Vehicle Error:', error);
        res.status(500).json({ message: 'An error occurred during verification.' });
    }
};

// Controller that uses the fake JSON database for challan checks
const checkChallan = async (req, res) => {
    try {
        const owner_id = req.user.id;
        const { vehicle_id } = req.params;

        const [vehicles] = await db.query('SELECT registration_number FROM vehicles WHERE vehicle_id = ? AND owner_id = ?', [vehicle_id, owner_id]);
        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'Vehicle not found.' });
        }
        const registrationNumber = vehicles[0].registration_number;

        // Look up the registration number in our fake database
        const challanInfo = fakeChallanData[registrationNumber];

        let simulatedResponse;

        if (challanInfo) {
            // If a record is found, use it
            simulatedResponse = {
                status: challanInfo.challanCount > 0 ? "warning" : "success",
                ...challanInfo
            };
        } else {
            // If the vehicle number is not in our fake DB, return a default success message
            simulatedResponse = {
                status: "success",
                challanCount: 0,
                message: `No pending challans found for ${registrationNumber}.`,
            };
        }
        
        console.log(`SIMULATING CHALLAN CHECK for vehicle: ${registrationNumber}. Result: ${simulatedResponse.message}`);
        res.status(200).json(simulatedResponse);

    } catch (error) {
        console.error('Challan Check Error:', error);
        res.status(500).json({ message: 'An error occurred during the challan check.' });
    }
};

module.exports = {
    addVehicle,
    getMyVehicles,
    deleteVehicle,
    verifyVehicle,
    checkChallan,
};

