const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['fertilizer', 'pesticide', 'seed', 'tool', 'other'],
      required: true,
    },
    // Disease names this product treats — used for AI recommendation matching
    targetDiseases: [{ type: String, lowercase: true, trim: true }],
    // Price stored in GHS pesewas (smallest unit) to avoid float arithmetic
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String }], // Cloudinary URLs
    isActive: { type: Boolean, default: true },
    sales: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Full-text search index on name and description
productSchema.index({ name: 'text', description: 'text' });
// Index for disease-based filtering used in AI recommendations
productSchema.index({ targetDiseases: 1 });
productSchema.index({ seller: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
