import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

// The Express app lives here (no listen(), no database connection) so tests can
// import it directly. server.js is responsible for loading .env, connecting to
// MongoDB and calling listen().
const app = express();

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

// Request logging middleware (silenced in tests to keep output readable)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

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

export default app;
