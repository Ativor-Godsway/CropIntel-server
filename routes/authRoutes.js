const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  googleCallback,
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  toggleRole,
  updateProfile,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

router.post('/register', register);
router.post('/login', login);

router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Protected routes
router.patch('/toggle-role', verifyToken, toggleRole);
router.patch('/profile', verifyToken, uploadAvatar, updateProfile);

// Get current user
router.get('/me', verifyToken, (req, res) => res.json({ user: req.user }));

module.exports = router;
