const express = require('express');
const { getBooks, getBook, addBook, updateBook, deleteBook } = require('../controllers/bookController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.get('/', protect, getBooks);
router.get('/:id', protect, getBook);
router.post('/', protect, adminOnly, addBook);
router.put('/:id', protect, adminOnly, updateBook);
router.delete('/:id', protect, adminOnly, deleteBook);

module.exports = router;
