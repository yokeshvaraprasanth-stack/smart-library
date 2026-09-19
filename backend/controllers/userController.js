const User = require('../models/User');

async function getUsers(req, res, next) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function updateWishlist(req, res, next) {
  try {
    const { bookId, saved } = req.body;
    const update = saved ? { $addToSet: { wishlist: bookId } } : { $pull: { wishlist: bookId } };
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = { getUsers, updateWishlist };
