const express  = require('express');
const router   = express.Router();
const { createOrder, getBuyerOrders, getSellerOrders, updateOrderStatus } = require('../controllers/orderController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const { validateOrder }           = require('../middleware/validators/orderValidators');

router.use(verifyToken);

router.post  ('/',               validateOrder, createOrder);
router.get   ('/my-orders',      getBuyerOrders);
router.get   ('/seller-orders',  verifyRole('seller'), getSellerOrders);
router.patch ('/:id/status',     verifyRole('seller'), updateOrderStatus);

module.exports = router;
