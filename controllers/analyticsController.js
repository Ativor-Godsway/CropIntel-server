const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * GET /api/analytics/seller
 * Returns revenue, order counts, top products, and chart data for the seller dashboard.
 */
const getSellerAnalytics = async (req, res, next) => {
  try {
    const sellerId = req.user._id;

    // Get all this seller's products
    const products = await Product.find({ seller: sellerId });
    const productIds = products.map((p) => p._id);

    // Get all paid+ orders that contain at least one of this seller's products
    const orders = await Order.find({
      'items.product': { $in: productIds },
      status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
    }).populate('items.product', 'name category price');

    // Total revenue and total order count
    let totalRevenue = 0;
    let totalOrders = orders.length;

    // Product-level sales aggregation
    const productSales = {}; // productId -> { name, revenue, units }
    const categorySales = {}; // category -> revenue

    // Monthly revenue (last 6 months)
    const monthlyRevenue = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[key] = 0;
    }

    for (const order of orders) {
      const orderMonth = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;

      for (const item of order.items) {
        // Only count this seller's products
        if (!productIds.some((id) => id.toString() === item.product._id.toString())) continue;

        const lineRevenue = item.priceAtPurchase * item.quantity;
        totalRevenue += lineRevenue;

        if (monthlyRevenue[orderMonth] !== undefined) {
          monthlyRevenue[orderMonth] += lineRevenue;
        }

        const pid = item.product._id.toString();
        if (!productSales[pid]) {
          productSales[pid] = { name: item.product.name, revenue: 0, units: 0 };
        }
        productSales[pid].revenue += lineRevenue;
        productSales[pid].units += item.quantity;

        const cat = item.product.category;
        categorySales[cat] = (categorySales[cat] || 0) + lineRevenue;
      }
    }

    // Top-selling product
    const topProduct = Object.values(productSales).sort((a, b) => b.units - a.units)[0] || null;

    // Format monthly chart data for Recharts
    const monthlyChartData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue: revenue / 100, // convert pesewas to GHS for display
    }));

    // Format category pie data
    const categoryChartData = Object.entries(categorySales).map(([category, revenue]) => ({
      category,
      revenue: revenue / 100,
    }));

    res.json({
      stats: {
        totalRevenue: totalRevenue / 100, // GHS
        totalOrders,
        activeListings: products.filter((p) => p.isActive).length,
        topProduct: topProduct?.name || 'N/A',
      },
      monthlyChartData,
      categoryChartData,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSellerAnalytics };
