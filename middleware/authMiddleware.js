const jwt  = require('jsonwebtoken');
const config = require('../config');

/**
 * Verify JWT access token from Authorization header.
 * Attaches only safe decoded fields — no DB lookup on every request.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    // Attach minimal safe fields only — never the full user document
    req.user = {
      id:         decoded.userId,
      email:      decoded.email,
      activeRole: decoded.activeRole,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Require a specific activeRole. Must be used after verifyToken.
 */
const verifyRole = (role) => (req, res, next) => {
  if (req.user?.activeRole !== role) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

// Alias kept for backward-compatibility with existing route files
const requireRole = verifyRole;

module.exports = { verifyToken, verifyRole, requireRole };
