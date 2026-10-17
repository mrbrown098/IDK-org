import jwt from 'jsonwebtoken';

const PLACEHOLDER_PATTERN = /your_|change_this|changeme/i;
const MIN_PRODUCTION_SECRET_LENGTH = 32;

// Resolve and validate the signing secret once, at startup, so a misconfigured
// server fails fast instead of signing tokens with a guessable value.
const resolveJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim()) {
    throw new Error(
      'JWT_SECRET is not set. Copy .env.example to .env and set JWT_SECRET. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    if (PLACEHOLDER_PATTERN.test(secret)) {
      throw new Error('JWT_SECRET is still a placeholder value. Set a real random secret before running in production.');
    }
    if (secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production.`);
    }
  }

  return secret;
};

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Generate JWT Token
// Note: iat is set automatically by jsonwebtoken (in seconds). Do not add it
// manually; a millisecond iat made tokens effectively never expire.
export const generateToken = (userId, email) => {
  try {
    const token = jwt.sign(
      {
        userId: userId,
        email: email
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRY,
        algorithm: 'HS256'
      }
    );

    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
};

// Verify JWT Token
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

// Decode token without verification (for debugging)
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
};

// Middleware to protect routes
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
      code: 'INVALID_TOKEN'
    });
  }
};
