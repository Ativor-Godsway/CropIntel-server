const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Order    = require('../models/Order');
const Product  = require('../models/Product');
const User     = require('../models/User');
const mongoose = require('mongoose');
const { initializePayment, verifyPayment } = require('../services/paystackService');
const catchAsync = require('../utils/catchAsync');
const logger     = require('../utils/logger');
const config     = require('../config');

// ─── POST /api/payments/initialize ────────────────────────────────────────────

const initializeTransaction = catchAsync(async (req, res) => {
  console.log('Initialize route hit', { orderId: req.body.orderId, user: req.user?.id });

  const { orderId } = req.body;

  if (!mongoose.isValidObjectId(orderId)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  const order = await Order.findOne({ _id: orderId, buyer: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (order.status !== 'pending') {
    return res.status(400).json({ message: 'Order is already paid or cancelled' });
  }

  const reference = `CROPINTEL-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
  order.paystackReference = reference;
  await order.save();

  let result;
  try {
    result = await initializePayment({
      email:       req.user.email,
      amount:      order.totalAmount,
      reference,
      callbackUrl: `${config.CLIENT_URL}/checkout/verify?reference=${reference}`,
      metadata: {
        orderId: order._id.toString(),
        userId:  req.user.id.toString(),
      },
    });
  } catch (err) {
    const paystackError = err.response?.data?.message || err.message;
    console.error('Paystack initialize error:', paystackError);
    return res.status(502).json({ message: 'Payment gateway error', detail: paystackError });
  }

  if (!result?.status) {
    return res.status(502).json({ message: 'Failed to initialize payment' });
  }

  res.json({
    authorizationUrl: result.data.authorization_url,
    reference,
    accessCode: result.data.access_code,
  });
});

// ─── GET /api/payments/verify/:reference ──────────────────────────────────────

const verifyTransaction = catchAsync(async (req, res) => {
  const { reference } = req.params;

  const order = await Order.findOne({ paystackReference: reference }).populate('items.product');
  if (!order) return res.status(404).json({ message: 'Order not found for this reference' });

  if (order.status !== 'pending') {
    return res.json({ order, message: 'Already processed' });
  }

  let result;
  try {
    result = await verifyPayment(reference);
  } catch (err) {
    const paystackError = err.response?.data?.message || err.message;
    console.error('Paystack verify error:', paystackError);
    return res.status(502).json({ message: 'Payment gateway error', detail: paystackError });
  }

  if (!result?.status || result.data.status !== 'success') {
    return res.status(402).json({ message: 'Payment not successful' });
  }

  order.status                = 'paid';
  order.paystackTransactionId = result.data.id?.toString();
  await order.save();

  await _updateStockAndSales(order);
  await order.populate('items.product', 'name images price');
  res.json({ order, message: 'Payment verified successfully' });
});

// ─── POST /api/payments/webhook (raw body, HMAC verified) ─────────────────────

const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody   = req.body; // Buffer from express.raw()

    if (!signature) {
      logger.warn('Paystack webhook: missing signature header', { ip: req.ip });
      return res.status(401).json({ message: 'Missing signature' });
    }

    // HMAC-SHA512 verification
    const computedHex = crypto
      .createHmac('sha512', config.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    const sigBuf  = Buffer.from(signature,    'hex');
    const compBuf = Buffer.from(computedHex,  'hex');

    if (
      sigBuf.length  !== compBuf.length ||
      !crypto.timingSafeEqual(sigBuf, compBuf)
    ) {
      logger.warn('Paystack webhook: invalid HMAC signature', { ip: req.ip });
      return res.status(401).json({ message: 'Invalid signature' });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      return res.status(400).json({ message: 'Invalid JSON body' });
    }

    const { event: eventType, data } = event;

    if (eventType === 'charge.success') {
      // Idempotency: skip if already processed
      const order = await Order.findOne({ paystackReference: data.reference });
      if (!order) return res.status(200).json({ received: true });
      if (order.status !== 'pending') return res.status(200).json({ received: true, note: 'already processed' });

      order.status                = 'paid';
      order.paystackTransactionId = data.id?.toString();
      await order.save();

      const populated = await Order.findById(order._id).populate('items.product');
      await _updateStockAndSales(populated);

    } else if (['transfer.failed', 'transfer.reversed'].includes(eventType)) {
      logger.warn(`Paystack event: ${eventType}`, { reference: data.reference });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Webhook processing error', { error: err.message, stack: err.stack });
    res.status(200).json({ received: true }); // Always 200 to prevent Paystack retries
  }
};

// ─── Internal helper ──────────────────────────────────────────────────────────

const _updateStockAndSales = async (order) => {
  for (const item of order.items) {
    const productId = item.product?._id || item.product;
    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: -item.quantity, sales: item.quantity },
    });
  }

  // Update seller totalSales
  const sellerRevenue = {};
  for (const item of order.items) {
    const productId = item.product?._id || item.product;
    const product   = await Product.findById(productId).select('seller');
    if (product) {
      const sid = product.seller.toString();
      sellerRevenue[sid] = (sellerRevenue[sid] || 0) + item.priceAtPurchase * item.quantity;
    }
  }
  for (const [sid, rev] of Object.entries(sellerRevenue)) {
    await User.findByIdAndUpdate(sid, { $inc: { 'sellerProfile.totalSales': rev } });
  }
};

module.exports = { initializeTransaction, verifyTransaction, handleWebhook };
