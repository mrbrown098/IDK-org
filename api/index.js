import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/database.js';

// Vercel entry point. Every /api/* request (and /health) is routed here by
// vercel.json. The Express app is reused between requests while the function
// stays warm, and so is the database connection.
let connecting = null;

async function ensureDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    connecting = connectDB().finally(() => {
      connecting = null;
    });
  }
  await connecting;
}

export default async function handler(req, res) {
  const path = (req.url || '').split('?')[0];

  // The health check does not need the database.
  if (path !== '/health') {
    try {
      await ensureDatabase();
    } catch (error) {
      console.error('Database connection failed:', error.message);
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        message: 'The database is not reachable right now. Please try again in a moment.'
      }));
      return;
    }
  }

  return app(req, res);
}
