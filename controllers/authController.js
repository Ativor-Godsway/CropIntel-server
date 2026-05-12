const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/User");
const {
  generateOTP,
  sendOTP,
  hashOTP,
  verifyOTP,
} = require("../services/otpService");

// ─── Token helpers ─────────────────────────────────────────────────────────────

const signAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });

const signRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

// Send refresh token as httpOnly cookie + access token in body
const sendTokens = (res, user) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return { accessToken, user };
};

// ─── Email / Password ──────────────────────────────────────────────────────────

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(409).json({ message: "Email already registered" });

    // passwordHash field triggers bcrypt hashing in the pre-save hook
    const user = await User.create({ name, email, passwordHash: password });
    const { accessToken } = sendTokens(res, user);
    res.status(201).json({ accessToken, user });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const { accessToken } = sendTokens(res, user);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
};

// ─── Google OAuth ──────────────────────────────────────────────────────────────

const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: false,
});

const googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
      );
    }
    const { accessToken } = sendTokens(res, user);
    // Redirect to frontend with token in query param — frontend stores it
    res.redirect(
      `${process.env.CLIENT_URL}/auth/google/callback?token=${accessToken}`,
    );
  })(req, res, next);
};

// ─── Phone OTP ─────────────────────────────────────────────────────────────────

const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone)
      return res.status(400).json({ message: "Phone number is required" });

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert user by phone — create if not exists
    await User.findOneAndUpdate(
      { phone },
      { phone, otpHash, otpExpiry },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await sendOTP(phone, otp);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    const user = await User.findOne({ phone });
    if (!user)
      return res.status(404).json({ message: "Phone number not found" });

    if (!user.otpHash || !user.otpExpiry) {
      return res
        .status(400)
        .json({ message: "No OTP requested for this number" });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const valid = await verifyOTP(otp, user.otpHash);
    if (!valid) return res.status(400).json({ message: "Invalid OTP" });

    // Clear OTP fields and mark phone as verified
    user.isPhoneVerified = true;
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    if (name && !user.name) user.name = name;
    await user.save();

    const { accessToken } = sendTokens(res, user);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
};

// ─── Token management ─────────────────────────────────────────────────────────

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const accessToken = signAccessToken(user._id);
    res.json({ accessToken, user });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Refresh token expired, please log in again" });
    }
    next(err);
  }
};

const logout = (req, res) => {
  res.clearCookie("refreshToken", { httpOnly: true, sameSite: "lax" });
  res.json({ message: "Logged out successfully" });
};

// ─── Role toggle ──────────────────────────────────────────────────────────────

const toggleRole = async (req, res, next) => {
  try {
    const user = req.user;
    user.activeRole = user.activeRole === "buyer" ? "seller" : "buyer";
    await user.save();
    res.json({ user, activeRole: user.activeRole });
  } catch (err) {
    next(err);
  }
};

// ─── Update profile ────────────────────────────────────────────────────────────

const updateProfile = async (req, res, next) => {
  try {
    const { name, sellerProfile } = req.body;
    const user = req.user;

    if (name) user.name = name;
    if (sellerProfile) {
      user.sellerProfile = {
        ...(user.sellerProfile.toObject?.() || user.sellerProfile),
        ...sellerProfile,
      };
    }
    if (req.file) user.avatar = req.file.path; // Cloudinary URL

    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
