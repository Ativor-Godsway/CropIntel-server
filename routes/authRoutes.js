const express  = require('express');
const router   = express.Router();
const {
  register, login,
  googleAuth, googleCallback,
  sendOtp, verifyOtp,
  refreshToken, logout,
  toggleRole, updateProfile, getMe,
} = require('../controllers/authController');
const { verifyToken }  = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');
const { authLimiter }  = require('../middleware/rateLimiter');
const {
  validateRegister,
  validateLogin,
  validateOTP,
  validateSendOTP,
} = require('../middleware/validators/authValidators');

// Public — rate limited
router.post('/register',   authLimiter, validateRegister, register);
router.post('/login',      authLimiter, validateLogin,    login);
router.post('/send-otp',   authLimiter, validateSendOTP,  sendOtp);
router.post('/verify-otp', authLimiter, validateOTP,      verifyOtp);

// Google OAuth
router.get('/google',          googleAuth);
router.get('/google/callback', googleCallback);

// Token management
router.post('/refresh-token', refreshToken);
router.post('/logout',        logout);

// Protected
router.get   ('/me',        verifyToken, getMe);
router.patch ('/toggle-role', verifyToken, toggleRole);
router.patch ('/profile',    verifyToken, uploadAvatar, updateProfile);

module.exports = router;
