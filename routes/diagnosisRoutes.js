const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const {
  analyzeDiagnosis,
  analyzeTextDiagnosis,
  getDiagnosisHistory,
  getDiagnosisById,
  getDiagnosis,
} = require('../controllers/diagnosisController');
const { verifyToken }       = require('../middleware/authMiddleware');
const { diagnosisLimiter }  = require('../middleware/rateLimiter');
const { validateDiagnosis } = require('../middleware/validators/diagnosisValidators');

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed'), false);
  },
});

router.use(verifyToken);

router.post('/analyze',      diagnosisLimiter, memoryUpload.single('cropImage'), validateDiagnosis, analyzeDiagnosis);
router.post('/analyze-text', diagnosisLimiter, validateDiagnosis, analyzeTextDiagnosis);
router.get  ('/history',     getDiagnosisHistory);
router.get  ('/history/:id', getDiagnosisById);
router.get  ('/:id',         getDiagnosis);

module.exports = router;
