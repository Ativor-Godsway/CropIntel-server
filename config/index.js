require('dotenv').config();

// NODE_ENV and CLIENT_URL have safe defaults — exclude from hard-required list
const required = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ANTHROPIC_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'PAYSTACK_SECRET_KEY',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  missing.forEach((key) => console.error(`[CONFIG] Missing required env var: ${key}`));
  process.exit(1);
}

module.exports = {
  MONGO_URI:              process.env.MONGO_URI,
  JWT_SECRET:             process.env.JWT_SECRET,
  JWT_REFRESH_SECRET:     process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN:         process.env.JWT_EXPIRES_IN         || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ANTHROPIC_API_KEY:      process.env.ANTHROPIC_API_KEY,
  CLOUDINARY_CLOUD_NAME:  process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY:     process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET:  process.env.CLOUDINARY_API_SECRET,
  PAYSTACK_SECRET_KEY:    process.env.PAYSTACK_SECRET_KEY,
  CLIENT_URL:             process.env.CLIENT_URL || 'https://crop-intel-client.vercel.app',
  NODE_ENV:               process.env.NODE_ENV   || 'production',
  PORT:                   parseInt(process.env.PORT) || 5000,
};
