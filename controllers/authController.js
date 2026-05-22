const jwt      = require('jsonwebtoken');
const passport = require('passport');
const User     = require('../models/User');
const config   = require('../config');
const catchAsync = require('../utils/catchAsync');
const { generateOTP, sendOTP, hashOTP, verifyOTP } = require('../services/otpService');

// ─── Token helpers ─────────────────────────────────────────────────────────────

const signAccessToken = (userId, email, activeRole) =>
  jwt.sign({ userId, email, activeRole }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });

const signRefreshToken = (userId) =>
  jwt.sign({ userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true,
  sameSite: 'none',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
};

const sendTokens = (res, user) => {
  const accessToken  = signAccessToken(user._id, user.email, user.activeRole);
  const refreshToken = signRefreshToken(user._id);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  return { accessToken };
};

// ─── Helpers for fetching the full user (used only in write operations) ────────

const fetchUser = (id) =>
  User.findById(id).select('-__v');

// ─── Register ──────────────────────────────────────────────────────────────────

const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const user = await User.create({ name, email, passwordHash: password });
  const { accessToken } = sendTokens(res, user);
  res.status(201).json({ accessToken, user });
});

// ─── Login ─────────────────────────────────────────────────────────────────────

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const { accessToken } = sendTokens(res, user);
  res.json({ accessToken, user });
});

// ─── Google OAuth ──────────────────────────────────────────────────────────────

const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${config.CLIENT_URL}/login?error=google_auth_failed`);
    }
    const { accessToken } = sendTokens(res, user);
    res.redirect(`${config.CLIENT_URL}/auth/google/callback?token=${accessToken}`);
  })(req, res, next);
};

// ─── OTP ───────────────────────────────────────────────────────────────────────

const sendOtp = catchAsync(async (req, res) => {
  const { phone } = req.body;

  const otp      = generateOTP();
  const otpHash  = await hashOTP(otp);
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await User.findOneAndUpdate(
    { phone },
    { phone, otpHash, otpExpiry },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await sendOTP(phone, otp);
  res.json({ message: 'OTP sent successfully' });
});

const verifyOtp = catchAsync(async (req, res) => {
  const { phone, otp, name } = req.body;

  const user = await User.findOne({ phone }).select('+otpHash +otpExpiry');
  if (!user) return res.status(404).json({ message: 'Phone number not found' });

  if (!user.otpHash || !user.otpExpiry) {
    return res.status(400).json({ message: 'No OTP requested for this number' });
  }
  if (new Date() > user.otpExpiry) {
    return res.status(400).json({ message: 'OTP has expired' });
  }

  const valid = await verifyOTP(otp, user.otpHash);
  if (!valid) return res.status(400).json({ message: 'Invalid OTP' });

  user.isPhoneVerified = true;
  user.otpHash         = undefined;
  user.otpExpiry       = undefined;
  if (name && !user.name) user.name = name;
  await user.save();

  const { accessToken } = sendTokens(res, user);
  res.json({ accessToken, user });
});

// ─── Token management ──────────────────────────────────────────────────────────

const refreshToken = catchAsync(async (req, res) => {
  console.log('Cookies received:', req.cookies);

  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token' });

  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch (err) {
    res.clearCookie('refreshToken', { ...COOKIE_OPTS, maxAge: undefined });
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired, please log in again' });
    }
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  const user = await fetchUser(decoded.userId);
  if (!user) return res.status(401).json({ message: 'User not found' });

  // Rotate: issue a fresh refresh token
  const newRefresh = signRefreshToken(user._id);
  res.cookie('refreshToken', newRefresh, COOKIE_OPTS);

  const accessToken = signAccessToken(user._id, user.email, user.activeRole);
  res.json({ accessToken, user });
});

const logout = (req, res) => {
  res.clearCookie('refreshToken', { ...COOKIE_OPTS, maxAge: undefined });
  res.json({ message: 'Logged out successfully' });
};

// ─── Role toggle ───────────────────────────────────────────────────────────────

const toggleRole = catchAsync(async (req, res) => {
  const user = await fetchUser(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.activeRole = user.activeRole === 'buyer' ? 'seller' : 'buyer';
  await user.save();

  // Issue new access token reflecting the new role
  const accessToken = signAccessToken(user._id, user.email, user.activeRole);
  res.json({ user, activeRole: user.activeRole, accessToken });
});

// ─── Update profile ────────────────────────────────────────────────────────────

const updateProfile = catchAsync(async (req, res) => {
  const user = await fetchUser(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const { name, sellerProfile } = req.body;

  if (name) user.name = name;
  if (sellerProfile) {
    user.sellerProfile = {
      ...(user.sellerProfile.toObject?.() || user.sellerProfile),
      ...sellerProfile,
    };
  }
  if (req.file) user.avatar = req.file.path;

  await user.save();
  res.json({ user });
});

// ─── Get current user ──────────────────────────────────────────────────────────

const getMe = catchAsync(async (req, res) => {
  const user = await fetchUser(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

module.exports = {
  register, login,
  googleAuth, googleCallback,
  sendOtp, verifyOtp,
  refreshToken, logout,
  toggleRole, updateProfile, getMe,
};
