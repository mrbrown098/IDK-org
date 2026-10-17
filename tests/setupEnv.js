// Runs before every test file. Sets the environment the app needs; no .env file
// or real secrets are used in tests.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-0123456789abcdef0123456789abcdef-not-for-production';
process.env.JWT_EXPIRY = '7d';
