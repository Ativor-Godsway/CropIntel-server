require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Diagnosis = require('../models/Diagnosis');

const PLACEHOLDER_IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1/samples/food/fish-vegetables';
const LEAF_IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-italy';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clean existing seed data
  await User.deleteMany({ email: { $in: ['farmer@farmly.test', 'seller@farmly.test'] } });

  // ── Users ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123', 12);

  const buyer = await User.create({
    name: 'Kofi Mensah',
    email: 'farmer@farmly.test',
    passwordHash: await bcrypt.hash('Password123', 12),
    activeRole: 'buyer',
    isPhoneVerified: false,
  });
  // Skip pre-save hook since we're providing the raw hash directly
  await User.findByIdAndUpdate(buyer._id, { passwordHash });

  const seller = await User.create({
    name: 'Ama Boateng',
    email: 'seller@farmly.test',
    passwordHash: await bcrypt.hash('Password123', 12),
    activeRole: 'seller',
    isPhoneVerified: false,
    sellerProfile: {
      businessName: 'AgroSupply Ghana',
      description: 'Premium farming supplies for Ghanaian farmers',
      location: 'Kumasi, Ashanti Region',
      totalSales: 0,
    },
  });
  await User.findByIdAndUpdate(seller._id, { passwordHash });

  console.log('✓ Users created (farmer@farmly.test / seller@farmly.test — password: Password123)');

  // ── Products ───────────────────────────────────────────────────────────────
  await Product.deleteMany({ seller: seller._id });

  const products = await Product.insertMany([
    {
      seller: seller._id,
      name: 'Mancozeb 80% WP Fungicide',
      description: 'Broad-spectrum protective fungicide for controlling late blight, early blight, and leaf spots.',
      category: 'pesticide',
      targetDiseases: ['late blight', 'early blight', 'leaf spot', 'downy mildew'],
      price: 8500, // GHS 85.00 in pesewas
      stock: 120,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Ridomil Gold MZ 68 WG',
      description: 'Systemic fungicide for late blight and downy mildew on tomatoes and potatoes.',
      category: 'pesticide',
      targetDiseases: ['late blight', 'downy mildew', 'phytophthora'],
      price: 15000,
      stock: 60,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'NPK 15-15-15 Fertilizer (25kg)',
      description: 'Balanced granular fertilizer for general crop nutrition. Improves plant immunity against diseases.',
      category: 'fertilizer',
      targetDiseases: ['nutrient deficiency', 'chlorosis', 'yellowing'],
      price: 32000,
      stock: 200,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Sulphur 80% WDG Fungicide',
      description: 'Contact fungicide and miticide effective against powdery mildew, rust, and spider mites.',
      category: 'pesticide',
      targetDiseases: ['powdery mildew', 'rust', 'mildew'],
      price: 7200,
      stock: 150,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Copper Hydroxide 77% WP',
      description: 'Protective bactericide and fungicide. Controls bacterial blight, canker, and leaf curl.',
      category: 'pesticide',
      targetDiseases: ['bacterial blight', 'leaf curl', 'canker', 'anthracnose'],
      price: 9800,
      stock: 80,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Neem-based Bio Pesticide (1L)',
      description: 'Organic neem extract for controlling a wide range of insects and fungal diseases. Safe for food crops.',
      category: 'pesticide',
      targetDiseases: ['aphids', 'whitefly', 'caterpillar', 'leaf blight'],
      price: 6000,
      stock: 300,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Urea 46% N Fertilizer (50kg)',
      description: 'High-nitrogen fertilizer for boosting vegetative growth and improving disease resistance.',
      category: 'fertilizer',
      targetDiseases: ['nitrogen deficiency', 'stunted growth', 'yellowing'],
      price: 45000,
      stock: 100,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Tomato F1 Hybrid Seeds (Pectomech)',
      description: 'Disease-resistant tomato hybrid with tolerance to late blight and fusarium wilt.',
      category: 'seed',
      targetDiseases: ['late blight', 'fusarium wilt', 'bacterial wilt'],
      price: 12500,
      stock: 500,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Maize Obatanpa (Improved) Seeds (2kg)',
      description: 'High-protein maize variety with resistance to grey leaf spot and common rust.',
      category: 'seed',
      targetDiseases: ['grey leaf spot', 'common rust', 'northern corn leaf blight'],
      price: 4800,
      stock: 750,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Kasugamycin Bactericide',
      description: 'Systemic bactericide for control of bacterial wilt, black rot, and soft rot in vegetables.',
      category: 'pesticide',
      targetDiseases: ['bacterial wilt', 'black rot', 'soft rot'],
      price: 11000,
      stock: 45,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Foliar Spray Micronutrients (500ml)',
      description: 'Complete micronutrient blend — zinc, iron, boron, manganese — corrects deficiencies quickly.',
      category: 'fertilizer',
      targetDiseases: ['micronutrient deficiency', 'zinc deficiency', 'iron deficiency', 'chlorosis'],
      price: 5500,
      stock: 200,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Hand Sprayer (16L Knapsack)',
      description: 'Durable knapsack sprayer for efficient application of pesticides and fungicides.',
      category: 'tool',
      targetDiseases: [],
      price: 18000,
      stock: 35,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'pH & EC Soil Test Kit',
      description: 'Quick soil testing kit for measuring pH and electrical conductivity — essential for disease prevention.',
      category: 'tool',
      targetDiseases: [],
      price: 9500,
      stock: 50,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Trichoderma Bio-fungicide (500g)',
      description: 'Biological fungicide using Trichoderma harzianum to control root rot and damping off.',
      category: 'pesticide',
      targetDiseases: ['root rot', 'damping off', 'fusarium wilt', 'pythium'],
      price: 7800,
      stock: 90,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
    {
      seller: seller._id,
      name: 'Potassium Phosphonate Systemic Fungicide',
      description: 'Systemic fungicide that moves both up and down in the plant. Excellent for Phytophthora control.',
      category: 'pesticide',
      targetDiseases: ['phytophthora', 'late blight', 'root rot', 'downy mildew'],
      price: 13500,
      stock: 70,
      images: [PLACEHOLDER_IMAGE],
      isActive: true,
    },
  ]);

  console.log(`✓ ${products.length} products created`);

  // ── Diagnoses ──────────────────────────────────────────────────────────────
  await Diagnosis.deleteMany({ user: buyer._id });

  const tomatoProducts = products.filter((p) =>
    p.targetDiseases.some((d) => d.includes('blight'))
  );
  const rustProducts = products.filter((p) =>
    p.targetDiseases.some((d) => d.includes('rust'))
  );
  const wiltProducts = products.filter((p) =>
    p.targetDiseases.some((d) => d.includes('wilt'))
  );

  await Diagnosis.insertMany([
    {
      user: buyer._id,
      imageUrl: LEAF_IMAGE,
      cropType: 'Tomato',
      diseaseName: 'Late Blight',
      severity: 'high',
      confidence: 94,
      symptoms: ['Dark water-soaked lesions on leaves', 'White powdery growth on undersides', 'Rapid browning of stems'],
      treatment: 'Apply Mancozeb or Ridomil Gold immediately. Remove and destroy infected plant parts. Improve air circulation. Spray every 7 days until symptoms subside.',
      prevention: 'Use resistant varieties. Avoid overhead irrigation. Rotate crops annually. Apply preventive fungicide sprays during rainy season.',
      recommendedProducts: tomatoProducts.slice(0, 4).map((p) => p._id),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      user: buyer._id,
      imageUrl: LEAF_IMAGE,
      cropType: 'Maize',
      diseaseName: 'Common Rust',
      severity: 'medium',
      confidence: 87,
      symptoms: ['Oval to elongated pustules on both leaf surfaces', 'Reddish-brown powdery spores', 'Yellow halo around pustules'],
      treatment: 'Apply sulfur-based or triazole fungicide. Scout weekly and spray when 5% of leaves show symptoms. Remove heavily infected leaves.',
      prevention: 'Plant rust-resistant maize varieties. Plant early in the season. Avoid excessive nitrogen fertilization.',
      recommendedProducts: rustProducts.slice(0, 4).map((p) => p._id),
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    },
    {
      user: buyer._id,
      imageUrl: LEAF_IMAGE,
      cropType: 'Pepper',
      diseaseName: 'Bacterial Wilt',
      severity: 'high',
      confidence: 91,
      symptoms: ['Sudden wilting of entire plant', 'Brown streaking in stem cross-section', 'Milky bacterial ooze from cut stem in water'],
      treatment: 'No effective chemical cure. Remove and destroy infected plants immediately. Drench surrounding soil with copper-based bactericide to prevent spread.',
      prevention: 'Use certified disease-free seeds. Solarize soil before planting. Rotate with non-solanaceous crops for 2-3 years. Avoid waterlogging.',
      recommendedProducts: wiltProducts.slice(0, 4).map((p) => p._id),
      createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
    },
  ]);

  console.log('✓ 3 sample diagnoses created');
  console.log('\n─────────────────────────────────────');
  console.log('Seed complete! Test credentials:');
  console.log('  Farmer:  farmer@farmly.test / Password123');
  console.log('  Seller:  seller@farmly.test / Password123');
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
