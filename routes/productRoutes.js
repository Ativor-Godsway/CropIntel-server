const express  = require('express');
const router   = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
  getSellerProducts,
} = require('../controllers/productController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const { uploadProductImages }     = require('../middleware/uploadMiddleware');
const { validateProduct }         = require('../middleware/validators/productValidators');

// Public
router.get('/', getProducts);

// Seller-specific listing — before /:id to avoid conflict
router.get('/seller/listings', verifyToken, verifyRole('seller'), getSellerProducts);

router.get('/:id', getProduct);

// Seller-only (mutating routes)
router.post  ('/',           verifyToken, verifyRole('seller'), uploadProductImages, validateProduct, createProduct);
router.put   ('/:id',        verifyToken, verifyRole('seller'), uploadProductImages, validateProduct, updateProduct);
router.delete('/:id',        verifyToken, verifyRole('seller'), deleteProduct);
router.patch ('/:id/toggle', verifyToken, verifyRole('seller'), toggleProduct);

module.exports = router;
