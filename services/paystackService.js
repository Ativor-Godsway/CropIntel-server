const axios = require('axios');

const PAYSTACK_BASE = 'https://api.paystack.co';

const paystackAxios = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Initialize a Paystack transaction.
 * amount must be in kobo/pesewas (smallest currency unit).
 */
const initializePayment = async ({ email, amount, reference, metadata, callbackUrl }) => {
  const response = await paystackAxios.post('/transaction/initialize', {
    email,
    amount, // in pesewas
    reference,
    currency: 'GHS',
    callback_url: callbackUrl,
    metadata,
  });
  return response.data; // { status, message, data: { authorization_url, access_code, reference } }
};

/**
 * Verify a Paystack transaction by its reference.
 */
const verifyPayment = async (reference) => {
  const response = await paystackAxios.get(`/transaction/verify/${reference}`);
  return response.data; // { status, message, data: { status, amount, ... } }
};

module.exports = { initializePayment, verifyPayment };
