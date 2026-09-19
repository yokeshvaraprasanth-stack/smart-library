const express = require('express');
const { getUsers, updateWishlist } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.get('/', protect, adminOnly, getUsers);
router.put('/wishlist', protect, updateWishlist);

module.exports = router;
