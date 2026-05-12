const express = require('express');
const router = express.Router();
const { createDiagnosis, getDiagnosisHistory, getDiagnosis } = require('../controllers/diagnosisController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken); // All diagnosis routes require authentication

router.post('/', createDiagnosis);
router.get('/history', getDiagnosisHistory);
router.get('/:id', getDiagnosis);

module.exports = router;
