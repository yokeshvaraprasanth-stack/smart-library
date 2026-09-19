const express = require('express');
const { register, login, profile, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, profile);
router.post('/logout', protect, logout);

module.exports = router;
