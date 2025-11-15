const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Import all the controller functions for vehicles
const { 
    addVehicle, 
    getMyVehicles, 
    deleteVehicle, 
    verifyVehicle,
    checkChallan
} = require('../controllers/vehicleController');

// @route   POST /api/vehicles/add
// @desc    Add a new vehicle for the logged-in user
// @access  Private
router.post('/add', authMiddleware, addVehicle);

// @route   GET /api/vehicles/my-vehicles
// @desc    Get all vehicles registered by the logged-in user
// @access  Private
router.get('/my-vehicles', authMiddleware, getMyVehicles);

// @route   DELETE /api/vehicles/:id
// @desc    Delete a specific vehicle owned by the logged-in user
// @access  Private
router.delete('/:id', authMiddleware, deleteVehicle);

// @route   POST /api/vehicles/verify/:vehicle_id
// @desc    Submit a vehicle for verification
// @access  Private
router.post('/verify/:vehicle_id', authMiddleware, verifyVehicle);

// @route   GET /api/vehicles/check-challan/:vehicle_id
// @desc    Check for challans on a specific vehicle (simulated)
// @access  Private
router.get('/check-challan/:vehicle_id', authMiddleware, checkChallan);

module.exports = router;

