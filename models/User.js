const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    email:           { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash:    { type: String, select: false }, // never returned by default
    googleId:        { type: String, sparse: true },
    phone:           { type: String, sparse: true },
    isPhoneVerified: { type: Boolean, default: false },
    avatar:          { type: String, default: '' },
    activeRole: {
      type: String,
      enum:    ['buyer', 'seller'],
      default: 'buyer',
    },
    sellerProfile: {
      businessName: { type: String, default: '' },
      description:  { type: String, default: '' },
      location:     { type: String, default: '' },
      totalSales:   { type: Number, default: 0 },
    },
    otpHash:   { type: String, select: false },
    otpExpiry: { type: Date,   select: false },
  },
  { timestamps: true, strict: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  const salt       = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otpHash;
  delete obj.otpExpiry;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
