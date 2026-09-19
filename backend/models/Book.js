const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    isbn: { type: String, required: true, unique: true, trim: true },
    publisher: { type: String, default: '' },
    publicationYear: { type: Number, required: true, min: 0 },
    language: { type: String, default: 'English' },
    description: { type: String, default: '' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalCopies: { type: Number, required: true, min: 1 },
    issuedCopies: { type: Number, default: 0, min: 0 },
    reservedCopies: { type: Number, default: 0, min: 0 },
    coverAccent: { type: String, default: '#334155' },
    coverEmoji: { type: String, default: '📚' },
  },
  { timestamps: true }
);

bookSchema.virtual('availableCopies').get(function availableCopies() {
  return Math.max(0, this.totalCopies - this.issuedCopies);
});
bookSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Book', bookSchema);
