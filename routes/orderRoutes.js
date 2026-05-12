const express = require('express');
const router = express.Router();
const { createOrder, getBuyerOrders, getSellerOrders, updateOrderStatus } = require('../controllers/orderController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', createOrder);
router.get('/my-orders', getBuyerOrders);
router.get('/seller-orders', requireRole('seller'), getSellerOrders);
router.patch('/:id/status', requireRole('seller'), updateOrderStatus);

module.exports = router;
