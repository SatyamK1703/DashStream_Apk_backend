import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

console.log('Razorpay Key ID:', keyId);
console.log('Razorpay Key Secret:', keySecret);

const instance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export const getRazorpayKeyId = () => keyId;
export const getWebhookSecret = () => webhookSecret;
export default instance;
