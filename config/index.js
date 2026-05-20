require('dotenv').config();

const required = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ANTHROPIC_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'PAYSTACK_SECRET_KEY',
  'CLIENT_URL',
  'NODE_ENV',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  missing.forEach((key) => console.error(`[CONFIG] Missing required env var: ${key}`));
  process.exit(1);
}

module.exports = {
  MONGO_URI:             process.env.MONGO_URI,
  JWT_SECRET:            process.env.JWT_SECRET,
  JWT_REFRESH_SECRET:    process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN:        process.env.JWT_EXPIRES_IN        || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ANTHROPIC_API_KEY:     process.env.ANTHROPIC_API_KEY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY:    process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  PAYSTACK_SECRET_KEY:   process.env.PAYSTACK_SECRET_KEY,
  CLIENT_URL:            process.env.CLIENT_URL,
  NODE_ENV:              process.env.NODE_ENV,
  PORT:                  parseInt(process.env.PORT) || 3000,
};
