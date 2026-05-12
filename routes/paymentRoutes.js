const express = require('express');
const router = express.Router();
const { initializeTransaction, verifyTransaction } = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/initialize', initializeTransaction);
router.get('/verify/:reference', verifyTransaction);

module.exports = router;
