const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    publishRide, 
    searchRides,
    getMyPublishedRides,
    getMyBookedRides,
    cancelRide
} = require('../controllers/rideController');

router.post('/publish', authMiddleware, publishRide);
router.get('/search', searchRides);
router.get('/my-published', authMiddleware, getMyPublishedRides);
router.get('/my-booked', authMiddleware, getMyBookedRides);
router.delete('/:ride_id', authMiddleware, cancelRide);

module.exports = router;

