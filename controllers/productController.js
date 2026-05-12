const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');

/**
 * GET /api/products
 * Public — supports ?search=&category=&disease=&minPrice=&maxPrice=&page=&limit=
 */
const getProducts = async (req, res, next) => {
  try {
    const { search, category, disease, minPrice, maxPrice, page = 1, limit = 12 } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }
    if (category) {
      query.category = category;
    }
    if (disease) {
      query.targetDiseases = { $elemMatch: { $regex: disease, $options: 'i' } };
    }
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
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id — public
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'seller',
      'name avatar sellerProfile'
    );
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products — seller only
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, description, category, targetDiseases, price, stock } = req.body;

    if (!name || !description || !category || !price) {
      return res.status(400).json({ message: 'name, description, category and price are required' });
    }

    // targetDiseases arrives as a comma-separated string or already an array
    let diseases = [];
    if (typeof targetDiseases === 'string') {
      diseases = targetDiseases.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
    } else if (Array.isArray(targetDiseases)) {
      diseases = targetDiseases.map((d) => d.toLowerCase().trim());
    }

    // Images uploaded via multer/Cloudinary — req.files contains the results
    const images = req.files ? req.files.map((f) => f.path) : [];

    const product = await Product.create({
      seller: req.user._id,
      name,
      description,
      category,
      targetDiseases: diseases,
      price: parseInt(price), // ensure integer pesewas
      stock: parseInt(stock) || 0,
      images,
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/products/:id — seller only, own product
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { name, description, category, targetDiseases, price, stock } = req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = parseInt(price);
    if (stock !== undefined) product.stock = parseInt(stock);

    if (targetDiseases !== undefined) {
      if (typeof targetDiseases === 'string') {
        product.targetDiseases = targetDiseases.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
      } else if (Array.isArray(targetDiseases)) {
        product.targetDiseases = targetDiseases.map((d) => d.toLowerCase().trim());
      }
    }

    // If new images are uploaded, add them (seller can also remove via frontend sending existingImages)
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => f.path);
      // Keep existing images sent from frontend + new ones, max 4
      const existingImages = req.body.existingImages
        ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages])
        : product.images;
      product.images = [...existingImages, ...newImages].slice(0, 4);
    }

    await product.save();
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/products/:id — seller only, own product
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete images from Cloudinary
    for (const url of product.images) {
      try {
        // Extract public_id from URL: .../farmly/products/abc123
        const parts = url.split('/');
        const publicId = parts.slice(-2).join('/').replace(/\.\w+$/, '');
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        // Non-fatal — log and continue
        console.warn('Failed to delete image from Cloudinary:', e.message);
      }
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/products/:id/toggle — seller only
 */
const toggleProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.isActive = !product.isActive;
    await product.save();
    res.json({ product, isActive: product.isActive });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/seller — seller's own listings
 */
const getSellerProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, toggleProduct, getSellerProducts };
