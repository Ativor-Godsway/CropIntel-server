const cloudinary = require('../config/cloudinary');

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer
 * @param {string} folder  - Cloudinary folder (e.g. 'farmly/products')
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadBuffer = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary by its public ID.
 */
const deleteImage = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { uploadBuffer, deleteImage };
