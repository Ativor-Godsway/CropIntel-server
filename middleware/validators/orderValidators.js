const { body } = require('express-validator');
const handleValidationErrors = require('./handleValidationErrors');

const GHANA_REGIONS = [
  'Greater Accra','Ashanti','Western','Eastern','Central','Northern',
  'Upper East','Upper West','Volta','Brong-Ahafo','Oti','Savannah',
  'North East','Western North','Ahafo','Bono East',
];

const validateOrder = [
  body('items')
    .isArray({ min: 1 }).withMessage('Order must contain at least one item'),

  body('items.*.productId')
    .isMongoId().withMessage('Each item must have a valid productId'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),

  body('shippingAddress.fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name must be under 100 characters'),

  body('shippingAddress.phone')
    .trim()
    .isMobilePhone('en-GH').withMessage('Shipping phone must be a valid Ghana mobile number'),

  body('shippingAddress.address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 300 }).withMessage('Address must be under 300 characters'),

  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City must be under 100 characters'),

  body('shippingAddress.region')
    .trim()
    .isIn(GHANA_REGIONS).withMessage(`Region must be one of the valid Ghana regions`),

  handleValidationErrors,
];

module.exports = { validateOrder };
