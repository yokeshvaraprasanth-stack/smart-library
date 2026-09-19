const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    reservedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
