const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
  getSellerProducts,
} = require('../controllers/productController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { uploadProductImages } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', getProducts);

// Seller-specific listing — must come before /:id to avoid conflict
router.get('/seller/listings', verifyToken, requireRole('seller'), getSellerProducts);

router.get('/:id', getProduct);

// Protected seller routes
router.post('/', verifyToken, requireRole('seller'), uploadProductImages, createProduct);
router.put('/:id', verifyToken, requireRole('seller'), uploadProductImages, updateProduct);
router.delete('/:id', verifyToken, requireRole('seller'), deleteProduct);
router.patch('/:id/toggle', verifyToken, requireRole('seller'), toggleProduct);

module.exports = router;
