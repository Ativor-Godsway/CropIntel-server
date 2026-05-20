const { body } = require('express-validator');
const handleValidationErrors = require('./handleValidationErrors');

const VALID_CATEGORIES = ['fertilizer', 'pesticide', 'seed', 'tool', 'other'];

const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 150 }).withMessage('Name must be under 150 characters')
    .escape(),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 1000 }).withMessage('Description must be under 1000 characters')
    .escape(),

  body('price')
    .isInt({ min: 1 }).withMessage('Price must be a positive integer (pesewas)'),

  body('stock')
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),

  body('category')
    .trim()
    .isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('targetDiseases')
    .optional()
    .isArray().withMessage('targetDiseases must be an array'),

  body('targetDiseases.*')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Each disease name must be under 100 characters')
    .escape(),

  handleValidationErrors,
];

module.exports = { validateProduct };
