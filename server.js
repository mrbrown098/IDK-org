// Must stay the FIRST import: ES imports are hoisted, so this is what makes
// .env load before any other module (e.g. jwt.js) reads process.env.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/config/database.js';
import authRoutes from './src/routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow requests from web and mobile
app.use(cors({
  origin: [
    process.env.WEB_URL || 'http://localhost:3000',
    process.env.MOBILE_URL || 'idk://app',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// DATABASE CONNECTION
// ============================================

// Connect to MongoDB on startup
connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'IDK.org API is running',
    version: '0.1.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Health check for monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API routes (will be added incrementally)
app.use('/api/auth', authRoutes);
// app.use('/api/quiz', quizRoutes);
// app.use('/api/tutor', tutorRoutes);
// app.use('/api/learning', learningRoutes);
// app.use('/api/user', userRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
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
