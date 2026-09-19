const mongoose = require('mongoose');
const Book = require('../models/Book');
const Reservation = require('../models/Reservation');
const Notification = require('../models/Notification');
const User = require('../models/User');

async function createReservation(req, res, next) {
  try {
    const { bookId } = req.body;
    if (!mongoose.isValidObjectId(bookId)) return res.status(400).json({ message: 'Valid bookId is required.' });
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    const existing = await Reservation.findOne({ user: req.user._id, book: bookId, status: 'Pending' });
    if (existing) return res.status(409).json({ message: 'You already have a pending reservation for this book.' });

    const reservation = await Reservation.create({ user: req.user._id, book: bookId });
    await Book.findByIdAndUpdate(bookId, { $inc: { reservedCopies: 1 } });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { reservedBooks: bookId } });
    await Notification.create({ user: req.user._id, text: `Your reservation for ${book.title} is pending approval.`, kind: 'info' });
    res.status(201).json({ reservation: await reservation.populate('book') });
  } catch (error) {
    next(error);
  }
}

async function getReservations(req, res, next) {
  try {
    const filter = req.user.role === 'ADMIN' ? {} : { user: req.user._id };
    const reservations = await Reservation.find(filter).populate('book').populate('user', '-password').sort({ createdAt: -1 });
    res.json({ reservations });
  } catch (error) {
    next(error);
  }
}

module.exports = { createReservation, getReservations };
