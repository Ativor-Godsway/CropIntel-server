const rateLimit = require('express-rate-limit');

const makeHandler = (message) => (req, res) =>
  res.status(429).json({ status: 'error', message });

// ─── General API limiter: 100 req / 15 min ───────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Too many requests, please try again later.'),
});

// ─── Auth limiter: 10 req / 15 min ───────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Too many attempts. Please try again in 15 minutes.'),
});

// ─── Diagnosis limiter: 20 req / hour ────────────────────────────────────────
const diagnosisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Diagnosis limit reached. Please wait before submitting again.'),
});

// ─── Paystack webhook limiter: 50 req / min ──────────────────────────────────
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Too many webhook requests.'),
});

module.exports = { generalLimiter, authLimiter, diagnosisLimiter, webhookLimiter };
