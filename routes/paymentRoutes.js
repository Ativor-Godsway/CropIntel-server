const express  = require('express');
const router   = express.Router();
const { initializeTransaction, verifyTransaction, handleWebhook } = require('../controllers/paymentController');
const { verifyToken }    = require('../middleware/authMiddleware');
const { webhookLimiter } = require('../middleware/rateLimiter');

// Webhook: raw body (registered before express.json in server.js via express.raw)
router.post('/webhook', webhookLimiter, handleWebhook);

// Protected endpoints
router.use(verifyToken);
router.post('/initialize', initializeTransaction);
router.get  ('/verify/:reference', verifyTransaction);

module.exports = router;
