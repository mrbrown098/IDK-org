// Must stay the FIRST import: ES imports are hoisted, so this is what makes
// .env load before any other module (e.g. jwt.js) reads process.env.
import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/database.js';

const PORT = process.env.PORT || 5000;

// ============================================
// DATABASE CONNECTION
// ============================================

// Connect to MongoDB on startup
connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// ============================================
// SERVER STARTUP
// ============================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 IDK.org Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📍 API Base: http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50) + '\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nServer shutting down gracefully...');
  process.exit(0);
});

export default app;
