require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const databaseRequired = require('./middleware/db');
const { notFound, errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const issueRoutes = require('./routes/issueRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

const app = express();
const port = Number(process.env.PORT) || 5000;
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  ...(process.env.CLIENT_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'librasmart-api' }));
app.use('/api', databaseRequired);
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reservations', reservationRoutes);
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  connectDB().finally(() => {
    app.listen(port, () => console.log(`LibraSmart API listening on http://localhost:${port}`));
  });
}

module.exports = { app, connectDB };
