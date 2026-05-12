const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, sparse: true },
    phone: { type: String, sparse: true },
    isPhoneVerified: { type: Boolean, default: false },
    avatar: { type: String, default: '' },
    activeRole: {
      type: String,
      enum: ['buyer', 'seller'],
      default: 'buyer',
    },
    sellerProfile: {
      businessName: { type: String, default: '' },
      description: { type: String, default: '' },
      location: { type: String, default: '' },
      totalSales: { type: Number, default: 0 },
    },
    // OTP fields for phone verification
    otpHash: { type: String },
    otpExpiry: { type: Date },
  },
  { timestamps: true }
);

// Hash password before save if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare plain password against stored hash
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Never return sensitive fields in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otpHash;
  delete obj.otpExpiry;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
