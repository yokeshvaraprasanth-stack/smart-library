const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    kind: { type: String, enum: ['info', 'success', 'warning', 'danger'], default: 'info' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
