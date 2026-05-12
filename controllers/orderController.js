const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * POST /api/orders
 * Creates an order with status 'pending'. Payment is initialized separately.
 */
const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, diagnosisId } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ message: 'Shipping address is required' });
    }

    // Fetch all products and validate stock
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });

    if (products.length !== items.length) {
      return res.status(400).json({ message: 'One or more products are unavailable' });
    }

    // Build order items with price snapshot
    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      const lineTotal = product.price * item.quantity;
      totalAmount += lineTotal;
      return {
        product: product._id,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      };
    });

    const order = await Order.create({
      buyer: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      status: 'pending',
      ...(diagnosisId && { diagnosisId }),
    });

    await order.populate('items.product', 'name images');
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/my-orders — buyer's orders
 */
const getBuyerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name images price category');

    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/seller-orders — orders containing this seller's products
 */
const getSellerOrders = async (req, res, next) => {
  try {
    // Find all this seller's product IDs first
    const sellerProducts = await Product.find({ seller: req.user._id }).select('_id');
    const productIds = sellerProducts.map((p) => p._id);

    const orders = await Order.find({
      'items.product': { $in: productIds },
      status: { $ne: 'pending' }, // Only show paid+ orders
    })
      .sort({ createdAt: -1 })
      .populate('buyer', 'name email phone')
      .populate('items.product', 'name images price');

    // Filter items to only include this seller's products for privacy
    const filtered = orders.map((order) => {
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.filter((item) =>
        productIds.some((id) => id.toString() === item.product._id.toString())
      );
      return orderObj;
    });

    res.json({ orders: filtered });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/status — seller updates status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['processing', 'shipped', 'delivered'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Verify this seller has a product in this order
    const sellerProducts = await Product.find({ seller: req.user._id }).select('_id');
    const productIds = sellerProducts.map((p) => p._id.toString());
    const hasProduct = order.items.some((item) => productIds.includes(item.product.toString()));

    if (!hasProduct) {
      return res.status(403).json({ message: 'You are not authorized to update this order' });
    }

    order.status = status;
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getBuyerOrders, getSellerOrders, updateOrderStatus };
