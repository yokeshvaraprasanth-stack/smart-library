const mongoose = require('mongoose');
const Book = require('../models/Book');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');

function statusFor(dueDate, returned) {
  if (returned) return 'Returned';
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'Overdue';
  if (days <= 3) return 'Due Soon';
  return 'Active';
}

function fineFor(dueDate, returned) {
  if (returned && new Date(returned) <= new Date(dueDate)) return 0;
  const days = Math.max(0, Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86400000));
  return days * 5;
}

async function issueBook(req, res, next) {
  try {
    const { bookId, dueDate } = req.body;
    if (!mongoose.isValidObjectId(bookId)) return res.status(400).json({ message: 'Valid bookId is required.' });
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    if (book.issuedCopies >= book.totalCopies) return res.status(409).json({ message: 'This book is currently unavailable.' });

    const activeIssue = await Issue.findOne({ user: req.user._id, book: bookId, returnDate: null });
    if (activeIssue) return res.status(409).json({ message: 'You already have this book issued.' });
    const finalDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 86400000);
    if (Number.isNaN(finalDueDate.getTime()) || finalDueDate <= new Date()) return res.status(400).json({ message: 'Due date must be a valid future date.' });

    const issue = await Issue.create({ user: req.user._id, book: bookId, dueDate: finalDueDate, status: statusFor(finalDueDate, null) });
    book.issuedCopies += 1;
    await book.save();
    await Notification.create({ user: req.user._id, text: `${book.title} was issued successfully to you.`, kind: 'success' });
    res.status(201).json({ issue: await issue.populate('book') });
  } catch (error) {
    next(error);
  }
}

async function getIssues(req, res, next) {
  try {
    const filter = req.user.role === 'ADMIN' && req.query.userId ? { user: req.query.userId } : req.user.role === 'ADMIN' ? {} : { user: req.user._id };
    const issues = await Issue.find(filter).populate('book').populate('user', '-password').sort({ issueDate: -1 });
    const updated = issues.map((issue) => ({ ...issue.toObject(), status: statusFor(issue.dueDate, issue.returnDate), fine: fineFor(issue.dueDate, issue.returnDate) }));
    res.json({ issues: updated });
  } catch (error) {
    next(error);
  }
}

async function returnBook(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid issue ID.' });
    const issue = await Issue.findById(req.params.id).populate('book');
    if (!issue) return res.status(404).json({ message: 'Issue record not found.' });
    if (req.user.role !== 'ADMIN' && String(issue.user) !== String(req.user._id)) return res.status(403).json({ message: 'You can only return your own books.' });
    if (issue.returnDate) return res.status(409).json({ message: 'This book has already been returned.' });

    issue.returnDate = new Date();
    issue.status = 'Returned';
    issue.fine = fineFor(issue.dueDate, issue.returnDate);
    await issue.save();
    await Book.findByIdAndUpdate(issue.book._id, { $inc: { issuedCopies: -1 } });
    await Notification.create({ user: issue.user, text: `You returned ${issue.book.title}.`, kind: 'success' });
    res.json({ issue });
  } catch (error) {
    next(error);
  }
}

module.exports = { issueBook, getIssues, returnBook };
