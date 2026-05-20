const mongoose   = require('mongoose');
const Diagnosis  = require('../models/Diagnosis');
const Product    = require('../models/Product');
const { diagnoseCrop, diagnoseCropByText } = require('../services/diagnosisService');
const { uploadBuffer }  = require('../services/cloudinaryService');
const catchAsync = require('../utils/catchAsync');
const logger     = require('../utils/logger');

const DAILY_LIMIT = 10;

const checkDailyLimit = async (userId) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return Diagnosis.countDocuments({ user: userId, createdAt: { $gte: since } });
};

const matchProducts = async (recommendedTypes) => {
  if (!recommendedTypes?.length) return [];
  const orConditions = recommendedTypes.flatMap((type) => [
    { name:           { $regex: type, $options: 'i' } },
    { description:    { $regex: type, $options: 'i' } },
    { targetDiseases: { $elemMatch: { $regex: type, $options: 'i' } } },
    { category:       { $regex: type, $options: 'i' } },
  ]);
  return Product.find({ isActive: true, $or: orConditions })
    .limit(6)
    .select('name price images category description seller');
};

// ─── POST /api/diagnosis/analyze ──────────────────────────────────────────────

const analyzeDiagnosis = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A crop image file is required (field: cropImage)' });
  }

  const count = await checkDailyLimit(req.user.id);
  if (count >= DAILY_LIMIT) {
    return res.status(429).json({ message: 'Daily diagnosis limit reached' });
  }

  const { buffer, mimetype } = req.file;

  if (buffer.length > 4 * 1024 * 1024) {
    return res.status(400).json({ message: 'Image too large for analysis (max 4 MB)' });
  }

  const imageBase64 = buffer.toString('base64');
  const aiResult    = await diagnoseCrop(imageBase64, mimetype);

  const products = await matchProducts(aiResult.recommendedProductTypes);

  const { url: imageUrl } = await uploadBuffer(buffer, 'cropintel/diagnoses');

  const saved = await Diagnosis.create({
    user:            req.user.id,
    cropType:        req.body.cropType || aiResult.cropIdentified || 'Unknown',
    imageUrl,
    diagnosisMethod: 'image',
    result: {
      cropIdentified:          aiResult.cropIdentified,
      diseaseIdentified:       aiResult.diseaseIdentified,
      confidence:              aiResult.confidence,
      severity:                aiResult.severity,
      description:             aiResult.description,
      causes:                  aiResult.causes,
      treatmentSteps:          aiResult.treatmentSteps,
      preventionTips:          aiResult.preventionTips,
      recommendedProductTypes: aiResult.recommendedProductTypes,
    },
    recommendedProducts: products.map((p) => p._id),
  });

  res.status(201).json({
    success: true,
    diagnosis: {
      _id:             saved._id,
      imageUrl,
      diagnosisMethod: 'image',
      cropType:        saved.cropType,
      createdAt:       saved.createdAt,
      ...aiResult,
    },
    recommendedProducts: products,
  });
});

// ─── POST /api/diagnosis/analyze-text ─────────────────────────────────────────

const analyzeTextDiagnosis = catchAsync(async (req, res) => {
  const count = await checkDailyLimit(req.user.id);
  if (count >= DAILY_LIMIT) {
    return res.status(429).json({ message: 'Daily diagnosis limit reached' });
  }

  const { textDescription, cropType } = req.body;

  const sanitized = String(textDescription).replace(/<[^>]*>/g, '').trim().slice(0, 1000);

  const aiResult = await diagnoseCropByText(sanitized, cropType.trim());
  const products = await matchProducts(aiResult.recommendedProductTypes);

  const saved = await Diagnosis.create({
    user:            req.user.id,
    cropType:        cropType.trim(),
    textDescription: sanitized,
    diagnosisMethod: 'text',
    result: {
      cropIdentified:          aiResult.cropIdentified,
      diseaseIdentified:       aiResult.diseaseIdentified,
      confidence:              aiResult.confidence,
      severity:                aiResult.severity,
      description:             aiResult.description,
      causes:                  aiResult.causes,
      treatmentSteps:          aiResult.treatmentSteps,
      preventionTips:          aiResult.preventionTips,
      recommendedProductTypes: aiResult.recommendedProductTypes,
    },
    recommendedProducts: products.map((p) => p._id),
  });

  res.status(201).json({
    success: true,
    diagnosis: {
      _id:             saved._id,
      diagnosisMethod: 'text',
      cropType:        saved.cropType,
      createdAt:       saved.createdAt,
      ...aiResult,
    },
    recommendedProducts: products,
  });
});

// ─── GET /api/diagnosis/history ───────────────────────────────────────────────

const getDiagnosisHistory = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const [diagnoses, total] = await Promise.all([
    Diagnosis.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recommendedProducts', 'name price images'),
    Diagnosis.countDocuments({ user: req.user.id }),
  ]);

  res.json({ diagnoses, total, page, pages: Math.ceil(total / limit) });
});

// ─── GET /api/diagnosis/history/:id ───────────────────────────────────────────

const getDiagnosisById = catchAsync(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  const diagnosis = await Diagnosis.findById(req.params.id)
    .populate('recommendedProducts', 'name price images category description seller');

  if (!diagnosis) return res.status(404).json({ message: 'Diagnosis not found' });

  if (diagnosis.user.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ diagnosis });
});

// ─── GET /api/diagnosis/:id ───────────────────────────────────────────────────

const getDiagnosis = catchAsync(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  const diagnosis = await Diagnosis.findById(req.params.id)
    .populate('recommendedProducts', 'name price images category description seller');

  if (!diagnosis) return res.status(404).json({ message: 'Diagnosis not found' });

  if (diagnosis.user.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ diagnosis });
});

module.exports = {
  analyzeDiagnosis,
  analyzeTextDiagnosis,
  getDiagnosisHistory,
  getDiagnosisById,
  getDiagnosis,
};
