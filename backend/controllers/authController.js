const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    studentId: user.studentId,
    email: user.email,
    phone: user.phone,
    role: user.role,
    wishlist: user.wishlist,
    reservedBooks: user.reservedBooks,
    joinedAt: user.createdAt,
  };
}

async function register(req, res, next) {
  try {
    const { fullName, studentId, email, phone, password } = req.body;
    if (!fullName || !studentId || !email || !phone || !password) return res.status(400).json({ message: 'All registration fields are required.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters.' });

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase().trim() }, { studentId: studentId.trim() }] });
    if (existing) return res.status(409).json({ message: 'An account with this email or Student ID already exists.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName: fullName.trim(), studentId: studentId.trim(), email: email.toLowerCase().trim(), phone: phone.trim(), password: hashedPassword });
    res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

function profile(req, res) {
  res.json({ user: publicUser(req.user) });
}

function logout(req, res) {
  res.json({ message: 'Logged out successfully.' });
}

module.exports = { register, login, profile, logout };
