const express = require('express');
const { issueBook, getIssues, returnBook } = require('../controllers/issueController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.post('/', protect, issueBook);
router.get('/', protect, getIssues);
router.put('/:id/return', protect, returnBook);

module.exports = router;
