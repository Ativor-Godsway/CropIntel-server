const mongoose  = require('mongoose');
const Product   = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const catchAsync = require('../utils/catchAsync');
const logger     = require('../utils/logger');

// ─── GET /api/products ────────────────────────────────────────────────────────

const getProducts = catchAsync(async (req, res) => {
  const { search, category, disease, page = 1, limit = 12 } = req.query;
  let { minPrice, maxPrice } = req.query;

  const query = { isActive: true };
  if (search)   query.$text = { $search: search };
  if (category) query.category = category;
  if (disease)  query.targetDiseases = { $elemMatch: { $regex: disease, $options: 'i' } };
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseInt(minPrice);
    if (maxPrice) query.price.$lte = parseInt(maxPrice);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('seller', 'name sellerProfile.businessName sellerProfile.location')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Product.countDocuments(query),
  ]);

  res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────

const getProduct = catchAsync(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }
  const product = await Product.findById(req.params.id).populate('seller', 'name avatar sellerProfile');
  if (!product || !product.isActive) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json({ product });
});

// ─── POST /api/products ───────────────────────────────────────────────────────

const createProduct = catchAsync(async (req, res) => {
  console.log('Product body received:', req.body);
  console.log('Product file received:', req.file, '| files:', req.files?.length);

  const { name, description, category, targetDiseases, price, stock } = req.body;

  let diseases = [];
  if (typeof targetDiseases === 'string') {
    diseases = targetDiseases.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
  } else if (Array.isArray(targetDiseases)) {
    diseases = targetDiseases.map((d) => d.toLowerCase().trim());
  }

  const images  = req.files ? req.files.map((f) => f.path) : [];

  const product = await Product.create({
    seller:        req.user.id,
    name,
    description,
    category,
    targetDiseases: diseases,
    price:          parseInt(price),
    stock:          parseInt(stock) || 0,
    images,
  });

  res.status(201).json({ product });
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────

const updateProduct = catchAsync(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  const product = await Product.findOne({ _id: req.params.id, seller: req.user.id });
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const { name, description, category, targetDiseases, price, stock } = req.body;

  if (name)        product.name        = name;
  if (description) product.description = description;
  if (category)    product.category    = category;
  if (price)       product.price       = parseInt(price);
  if (stock !== undefined) product.stock = parseInt(stock);

  if (targetDiseases !== undefined) {
    if (typeof targetDiseases === 'string') {
      product.targetDiseases = targetDiseases.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
    } else if (Array.isArray(targetDiseases)) {
      product.targetDiseases = targetDiseases.map((d) => d.toLowerCase().trim());
    }
  }

  if (req.files?.length > 0) {
    const newImages = req.files.map((f) => f.path);
    const existingImages = req.body.existingImages
      ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages])
      : product.images;
    product.images = [...existingImages, ...newImages].slice(0, 4);
  }

  await product.save();
  res.json({ product });
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────

const deleteProduct = catchAsync(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  const product = await Product.findOne({ _id: req.params.id, seller: req.user.id });
  if (!product) return res.status(404).json({ message: 'Product not found' });

  for (const url of product.images) {
    try {
      const parts    = url.split('/');
      const publicId = parts.slice(-2).join('/').replace(/\.\w+$/, '');
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      logger.warn('Failed to delete image from Cloudinary', { error: e.message });
    }
  }

  await product.deleteOne();
  res.json({ message: 'Product deleted' });
});

// ─── PATCH /api/products/:id/toggle ──────────────────────────────────────────

const toggleProduct = catchAsync(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  const product = await Product.findOne({ _id: req.params.id, seller: req.user.id });
  if (!product) return res.status(404).json({ message: 'Product not found' });

  product.isActive = !product.isActive;
  await product.save();
  res.json({ product, isActive: product.isActive });
});

// ─── GET /api/products/seller ─────────────────────────────────────────────────

const getSellerProducts = catchAsync(async (req, res) => {
  const products = await Product.find({ seller: req.user.id }).sort({ createdAt: -1 });
  res.json({ products });
});

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, toggleProduct, getSellerProducts };
