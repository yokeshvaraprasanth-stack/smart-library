const express = require('express');
const { createReservation, getReservations } = require('../controllers/reservationController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.post('/', protect, createReservation);
router.get('/', protect, getReservations);

module.exports = router;
