const mongoose = require('mongoose');

function databaseRequired(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database is unavailable. Check MONGO_URI and MongoDB.' });
  }
  next();
}

module.exports = databaseRequired;
