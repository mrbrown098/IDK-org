import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';

// The Express app lives here (no listen(), no database connection) so tests can
// import it directly. server.js is responsible for loading .env, connecting to
// MongoDB and calling listen().
const app = express();

// Trust proxy (needed behind hosting provider proxies like Render, Railway, Fly.io)
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS - Allow requests from web and mobile
const normalizeUrl = (url) => (url ? url.trim().replace(/\/+$/, '') : null);

const isAllowedOrigin = (origin) => {
  // Requests with no Origin header (curl, mobile apps, health checks) are allowed
  if (!origin) return true;

  const normalized = normalizeUrl(origin);
  const allowed = [
    normalizeUrl(process.env.WEB_URL),
    normalizeUrl(process.env.MOBILE_URL),
    'http://localhost:3000',
    'http://localhost:5000',
    'idk://app'
  ].filter(Boolean);

  return allowed.includes(normalized);
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
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

// Rate limiting for authentication routes (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => {
    const parsed = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  },
  statusCode: 429,
  message: {
    success: false,
    message: 'Too many attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.method !== 'POST') return true;
    if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_AUTH_RATE_LIMIT_TEST) {
      return true;
    }
    return false;
  }
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
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
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
