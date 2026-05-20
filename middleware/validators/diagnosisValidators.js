const { body } = require('express-validator');
const handleValidationErrors = require('./handleValidationErrors');

const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\//;

const validateDiagnosis = [
  body('cropType')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('cropType must be under 100 characters')
    .escape(),

  // cropType is required only for text-based diagnosis (no image file)
  body('cropType').custom((val, { req }) => {
    if (!req.file && !req.body.imageUrl && !val?.trim()) {
      throw new Error('cropType is required for text-based diagnosis');
    }
    return true;
  }),

  body('imageUrl')
    .optional()
    .isURL().withMessage('imageUrl must be a valid URL')
    .custom((val) => {
      if (!CLOUDINARY_URL_RE.test(val)) {
        throw new Error('imageUrl must be a Cloudinary URL');
      }
      return true;
    }),

  body('textDescription')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('textDescription must be 10–1000 characters')
    .escape(),

  body().custom((_, { req }) => {
    if (!req.file && !req.body.imageUrl && !req.body.textDescription) {
      throw new Error('Provide either an image file, imageUrl, or textDescription');
    }
    return true;
  }),

  handleValidationErrors,
];

module.exports = { validateDiagnosis };
