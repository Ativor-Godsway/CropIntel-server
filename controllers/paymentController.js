const catchAsync = require('../utils/catchAsync');
const logger     = require('../utils/logger');

// ─── POST /api/payments/initialize ────────────────────────────────────────────
// Paystack removed — orders are now created as 'paid' directly via POST /api/orders.
// Stub kept so existing frontend calls don't 404.

const initializeTransaction = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Mock payment initialized' });
});

// ─── GET /api/payments/verify/:reference ──────────────────────────────────────

const verifyTransaction = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Mock payment verified' });
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Kept to avoid breaking the raw-body middleware registered in server.js.

const handleWebhook = async (req, res) => {
  logger.info('Webhook received (mock mode — no-op)');
  res.status(200).json({ received: true });
};

module.exports = { initializeTransaction, verifyTransaction, handleWebhook };
