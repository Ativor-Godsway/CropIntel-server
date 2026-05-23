const mongoose  = require('mongoose');
const Order     = require('../models/Order');
const Product   = require('../models/Product');
const catchAsync = require('../utils/catchAsync');

// ─── POST /api/orders ─────────────────────────────────────────────────────────

const createOrder = catchAsync(async (req, res) => {
  const { items, shippingAddress, diagnosisId } = req.body;

  // Validate product ObjectIds
  for (const item of items) {
    if (!mongoose.isValidObjectId(item.productId)) {
      return res.status(400).json({ message: `Invalid productId: ${item.productId}` });
    }
  }

  const productIds = items.map((i) => i.productId);
  const products   = await Product.find({ _id: { $in: productIds }, isActive: true });

  if (products.length !== items.length) {
    return res.status(400).json({ message: 'One or more products are unavailable' });
  }

  let totalAmount = 0;
  const orderItems = items.map((item) => {
    const product = products.find((p) => p._id.toString() === item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    totalAmount += product.price * item.quantity;
    return { product: product._id, quantity: item.quantity, priceAtPurchase: product.price };
  });

  const order = await Order.create({
    buyer: req.user.id,
    items: orderItems,
    totalAmount,
    shippingAddress,
    status: 'paid',
    paystackReference: `MOCK-${Date.now()}`,
    ...(diagnosisId && mongoose.isValidObjectId(diagnosisId) && { diagnosisId }),
  });

  await order.populate('items.product', 'name images');
  res.status(201).json({
    status: 'success',
    message: 'Order placed successfully',
    data: { order },
    order, // keep for any existing frontend references
  });
});

// ─── GET /api/orders/my-orders ────────────────────────────────────────────────

const getBuyerOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ buyer: req.user.id })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name images price category');
  res.json({ orders });
});

// ─── GET /api/orders/seller-orders ───────────────────────────────────────────

const getSellerOrders = catchAsync(async (req, res) => {
  const sellerProducts = await Product.find({ seller: req.user.id }).select('_id');
  const productIds     = sellerProducts.map((p) => p._id);

  const orders = await Order.find({
    'items.product': { $in: productIds },
    status: { $ne: 'pending' },
  })
    .sort({ createdAt: -1 })
    .populate('buyer', 'name email phone')
    .populate('items.product', 'name images price');

  const filtered = orders.map((order) => {
    const obj  = order.toObject();
    obj.items  = obj.items.filter((item) =>
      productIds.some((id) => id.toString() === item.product._id.toString())
    );
    return obj;
  });

  res.json({ orders: filtered });
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────

const updateOrderStatus = catchAsync(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  const { status } = req.body;
  const allowed    = ['processing', 'shipped', 'delivered'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const sellerProducts = await Product.find({ seller: req.user.id }).select('_id');
  const productIds     = sellerProducts.map((p) => p._id.toString());
  const hasProduct     = order.items.some((item) => productIds.includes(item.product.toString()));

  if (!hasProduct) {
    return res.status(403).json({ message: 'You are not authorized to update this order' });
  }

  order.status = status;
  await order.save();
  res.json({ order });
});

module.exports = { createOrder, getBuyerOrders, getSellerOrders, updateOrderStatus };
