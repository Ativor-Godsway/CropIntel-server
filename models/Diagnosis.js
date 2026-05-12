const mongoose = require('mongoose');

const diagnosisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String, required: true },
    cropType: { type: String, required: true, trim: true },
    diseaseName: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    confidence: { type: Number, min: 0, max: 100, required: true },
    symptoms: [{ type: String }],
    treatment: { type: String },
    prevention: { type: String },
    recommendedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

// Index for fast user history queries
diagnosisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
