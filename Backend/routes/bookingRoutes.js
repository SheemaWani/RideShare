const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createBooking, cancelBooking } = require('../controllers/bookingController');

router.post('/book', authMiddleware, createBooking);
router.delete('/:booking_id', authMiddleware, cancelBooking);

module.exports = router;

