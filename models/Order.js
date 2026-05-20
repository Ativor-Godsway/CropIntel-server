const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true }, // price in pesewas at time of purchase
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paystackReference: { type: String },
    paystackTransactionId: { type: String },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      region: { type: String, required: true },
    },
    // Optional link to the diagnosis that triggered this order
    diagnosisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Diagnosis' },
  },
  { timestamps: true, strict: true }
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ paystackReference: 1 });
// Allows seller to find orders containing their products efficiently
orderSchema.index({ 'items.product': 1 });

module.exports = mongoose.model('Order', orderSchema);
