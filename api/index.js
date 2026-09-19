import backend from '../backend/server.js';

const { app, connectDB } = backend;

let databaseConnection;

export default async function handler(req, res) {
  databaseConnection ||= connectDB();
  await databaseConnection;
  return app(req, res);
};