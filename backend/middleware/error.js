function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  const status = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
  res.status(status).json({ message: error.message || 'Unexpected server error.' });
}

module.exports = { notFound, errorHandler };
