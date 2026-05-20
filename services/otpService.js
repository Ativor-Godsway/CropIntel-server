const bcrypt = require('bcryptjs');
const AfricasTalking = require('africastalking');

// Lazy-initialize Africa's Talking so missing credentials at startup don't crash the process.
// The client is created on first actual SMS send, by which point env vars are loaded.
let _sms = null;
const getSMS = () => {
  if (!_sms) {
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY || 'placeholder',
      username: process.env.AT_USERNAME || 'sandbox',
    });
    _sms = at.SMS;
  }
  return _sms;
};

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Africa's Talking SMS
const sendOTP = async (phone, otp) => {
  const message = `Your CropIntel verification code is: ${otp}. It expires in 10 minutes. Do not share this code.`;

  // In development/sandbox mode we log the OTP instead of sending
  if (process.env.AT_USERNAME === 'sandbox') {
    // In sandbox mode, log to console only in development so the OTP is visible during testing
    if (process.env.NODE_ENV !== 'production') {
      process.stdout.write(`[OTP SANDBOX] Phone: ${phone}, OTP: ${otp}\n`);
    }
    return { status: 'sent (sandbox)' };
  }

  const result = await getSMS().send({
    to: [phone],
    message,
    from: 'CropIntel',
  });

  return result;
};

// Hash the OTP for safe storage in the database
const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

// Compare a plain OTP against the stored hash
const verifyOTP = async (plainOTP, hashedOTP) => {
  return bcrypt.compare(plainOTP, hashedOTP);
};

module.exports = { generateOTP, sendOTP, hashOTP, verifyOTP };
