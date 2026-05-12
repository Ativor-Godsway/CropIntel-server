const Diagnosis = require('../models/Diagnosis');
const Product = require('../models/Product');
const { diagnoseCrop } = require('../services/claudeService');

/**
 * POST /api/diagnosis
 * Receives { imageUrl, cropType } — image already uploaded to Cloudinary by the frontend.
 * Calls Claude for analysis, finds matching products, saves and returns the diagnosis.
 */
const createDiagnosis = async (req, res, next) => {
  try {
    const { imageUrl, cropType } = req.body;

    if (!imageUrl || !cropType) {
      return res.status(400).json({ message: 'imageUrl and cropType are required' });
    }

    // Call Claude vision API
    const aiResult = await diagnoseCrop(imageUrl, cropType);

    // Find up to 4 products that target this disease (case-insensitive match)
    const diseaseLower = aiResult.diseaseName.toLowerCase();
    const recommendedProducts = await Product.find({
      isActive: true,
      targetDiseases: { $elemMatch: { $regex: diseaseLower, $options: 'i' } },
    })
      .limit(4)
      .select('name price images category');

    const productIds = recommendedProducts.map((p) => p._id);

    // Save to database
    const diagnosis = await Diagnosis.create({
      user: req.user._id,
      imageUrl,
      cropType,
      diseaseName: aiResult.diseaseName,
      severity: aiResult.severity,
      confidence: aiResult.confidence,
      symptoms: aiResult.symptoms,
      treatment: aiResult.treatment,
      prevention: aiResult.prevention,
      recommendedProducts: productIds,
    });

    // Return diagnosis with populated product details for immediate display
    const populated = diagnosis.toObject();
    populated.recommendedProducts = recommendedProducts;

    res.status(201).json({ diagnosis: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/diagnosis/history
 * Returns the current user's diagnoses, newest first.
 */
const getDiagnosisHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [diagnoses, total] = await Promise.all([
      Diagnosis.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('recommendedProducts', 'name price images'),
      Diagnosis.countDocuments({ user: req.user._id }),
    ]);

    res.json({ diagnoses, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/diagnosis/:id
 */
const getDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await Diagnosis.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('recommendedProducts', 'name price images category description');

    if (!diagnosis) return res.status(404).json({ message: 'Diagnosis not found' });

    res.json({ diagnosis });
  } catch (err) {
    next(err);
  }
};

module.exports = { createDiagnosis, getDiagnosisHistory, getDiagnosis };
