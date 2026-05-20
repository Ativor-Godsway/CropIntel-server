const { body } = require('express-validator');
const handleValidationErrors = require('./handleValidationErrors');

const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),

  body('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Valid email is required'),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone('en-GH').withMessage('Phone must be a valid Ghana mobile number'),

  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Valid email is required'),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

const validateOTP = [
  body('phone')
    .trim()
    .isMobilePhone('en-GH').withMessage('Phone must be a valid Ghana mobile number'),

  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),

  handleValidationErrors,
];

const validateSendOTP = [
  body('phone')
    .trim()
    .isMobilePhone('en-GH').withMessage('Phone must be a valid Ghana mobile number'),

  handleValidationErrors,
];

module.exports = { validateRegister, validateLogin, validateOTP, validateSendOTP };
