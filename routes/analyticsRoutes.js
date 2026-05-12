const express = require('express');
const router = express.Router();
const { getSellerAnalytics } = require('../controllers/analyticsController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/seller', verifyToken, requireRole('seller'), getSellerAnalytics);

module.exports = router;
