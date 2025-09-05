import dotenv from 'dotenv';
import Razorpay from 'razorpay';

// Load environment variables
dotenv.config();

// Validate required environment variables
const validateEnv = () => {
  const requiredVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Initialize Razorpay instance
const initRazorpay = () => {
  validateEnv();
  
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

// Create a singleton instance
const razorpayInstance = initRazorpay();

export default razorpayInstance;

// Export key ID for frontend use (public key)
export const getRazorpayKeyId = () => process.env.RAZORPAY_KEY_ID;

// Export webhook secret for verification
export const getWebhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET;