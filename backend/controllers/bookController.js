const mongoose = require('mongoose');
const Book = require('../models/Book');

function validateBook(body) {
  const required = ['title', 'author', 'category', 'isbn', 'publicationYear', 'totalCopies'];
  return required.filter((field) => body[field] === undefined || body[field] === '').map((field) => `${field} is required.`);
}

async function getBooks(req, res, next) {
  try {
    const { search, category, availability, year } = req.query;
    const filter = {};
    if (search) filter.$or = [{ title: new RegExp(search, 'i') }, { author: new RegExp(search, 'i') }, { isbn: new RegExp(search, 'i') }];
    if (category && category !== 'All') filter.category = category;
    if (year && Number.isFinite(Number(year))) filter.publicationYear = Number(year);
    if (availability === 'Available') filter.$expr = { $lt: ['$issuedCopies', '$totalCopies'] };
    if (availability === 'Issued') filter.issuedCopies = { $gt: 0 };
    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json({ books });
  } catch (error) {
    next(error);
  }
}

async function getBook(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid book ID.' });
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json({ book });
  } catch (error) {
    next(error);
  }
}

async function addBook(req, res, next) {
  try {
    const errors = validateBook(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });
    const book = await Book.create({ ...req.body, totalCopies: Number(req.body.totalCopies), publicationYear: Number(req.body.publicationYear) });
    res.status(201).json({ book });
  } catch (error) {
    next(error);
  }
}

async function updateBook(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid book ID.' });
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json({ book });
  } catch (error) {
    next(error);
  }
}

async function deleteBook(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid book ID.' });
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json({ message: 'Book deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getBooks, getBook, addBook, updateBook, deleteBook };
