const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    cropIdentified:         { type: String, default: 'Unknown' },
    diseaseIdentified:      { type: String, required: true },
    confidence:             { type: String, enum: ['High', 'Medium', 'Low'], required: true },
    severity:               { type: String, enum: ['Mild', 'Moderate', 'Severe'], required: true },
    description:            { type: String },
    causes:                 [{ type: String }],
    treatmentSteps:         [{ type: String }],
    preventionTips:         [{ type: String }],
    recommendedProductTypes:[{ type: String }],
  },
  { _id: false }
);

const diagnosisSchema = new mongoose.Schema(
  {
    user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cropType:        { type: String, required: true, trim: true },
    imageUrl:        { type: String, default: null },
    textDescription: { type: String, default: null },
    diagnosisMethod: { type: String, enum: ['image', 'text'], required: true },
    result:          { type: resultSchema, required: true },
    recommendedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true, strict: true }
);

diagnosisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
