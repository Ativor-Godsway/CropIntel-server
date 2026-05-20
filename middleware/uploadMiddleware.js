const multer  = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE_5MB    = 5 * 1024 * 1024;
const MAX_SIZE_2MB    = 2 * 1024 * 1024;

// ── Cloudinary storage factories ──────────────────────────────────────────────

const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:           'cropintel/products',
    allowed_formats:  ALLOWED_FORMATS,
    max_bytes:        MAX_SIZE_5MB,
    transformation:   [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'cropintel/avatars',
    allowed_formats: ALLOWED_FORMATS,
    max_bytes:       MAX_SIZE_2MB,
    transformation:  [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
});

// ── File filter ────────────────────────────────────────────────────────────────

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed'), false);
};

// ── Exportedmiddleware ─────────────────────────────────────────────────────────

const uploadProductImages = multer({
  storage:    productStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: MAX_SIZE_5MB, files: 4 },
}).array('images', 4);

const uploadAvatar = multer({
  storage:    avatarStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: MAX_SIZE_2MB },
}).single('avatar');

module.exports = { uploadProductImages, uploadAvatar };
