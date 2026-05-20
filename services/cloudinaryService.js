const cloudinary = require('../config/cloudinary');

const UPLOAD_OPTIONS = {
  resource_type:   'image',
  quality:         'auto',
  fetch_format:    'auto',
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  max_bytes:       5 * 1024 * 1024, // 5 MB
};

/**
 * Upload a file buffer to Cloudinary using signed SDK (server-side only).
 */
const uploadBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { ...UPLOAD_OPTIONS, folder },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

const deleteImage = (publicId) => cloudinary.uploader.destroy(publicId);

module.exports = { uploadBuffer, deleteImage };
