const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { initializePayment, verifyPayment } = require('../services/paystackService');

/**
 * POST /api/payments/initialize
 * Creates a Paystack transaction for a given order.
 */
const initializeTransaction = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, buyer: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order is already paid or cancelled' });
    }

    // Generate unique reference for this transaction
    const reference = `FARMLY-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    order.paystackReference = reference;
    await order.save();

    const result = await initializePayment({
      email: req.user.email,
      amount: order.totalAmount, // already in pesewas
      reference,
      callbackUrl: `${process.env.CLIENT_URL}/checkout/verify?reference=${reference}`,
      metadata: {
        orderId: order._id.toString(),
        userId: req.user._id.toString(),
      },
    });

    if (!result.status) {
      return res.status(502).json({ message: 'Failed to initialize payment' });
    }

    res.json({
      authorizationUrl: result.data.authorization_url,
      reference,
      accessCode: result.data.access_code,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payments/verify/:reference
 * Called after Paystack redirect. Verifies the payment and updates the order.
 */
const verifyTransaction = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const order = await Order.findOne({ paystackReference: reference }).populate('items.product');
    if (!order) return res.status(404).json({ message: 'Order not found for this reference' });

    // Prevent double-processing
    if (order.status !== 'pending') {
      return res.json({ order, message: 'Already processed' });
    }

    const result = await verifyPayment(reference);

    if (!result.status || result.data.status !== 'success') {
      return res.status(402).json({ message: 'Payment not successful', data: result.data });
    }

    // Update order to paid
    order.status = 'paid';
    order.paystackTransactionId = result.data.id?.toString();
    await order.save();

    // Decrement stock and increment sales for each product
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity, sales: item.quantity },
      });
    }

    // Update seller totalSales (sum of all their product sales amounts)
    // Group items by seller
    const sellerRevenue = {};
    for (const item of order.items) {
      const product = await Product.findById(item.product._id).select('seller');
      if (product) {
        const sellerId = product.seller.toString();
        sellerRevenue[sellerId] = (sellerRevenue[sellerId] || 0) + item.priceAtPurchase * item.quantity;
      }
    }

    for (const [sellerId, revenue] of Object.entries(sellerRevenue)) {
      await User.findByIdAndUpdate(sellerId, {
        $inc: { 'sellerProfile.totalSales': revenue },
      });
    }

    await order.populate('items.product', 'name images price');
    res.json({ order, message: 'Payment verified successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { initializeTransaction, verifyTransaction };
