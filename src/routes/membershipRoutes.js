import express from 'express';
import rateLimit from 'express-rate-limit';
import * as membershipController from '../controllers/membershipController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { membershipSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Rate limiting for membership purchases (prevent spam)
const membershipPurchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 purchase attempts per window per IP
  message: {
    status: "error",
    message: "Too many membership purchase attempts. Please try again later.",
    statusCode: 429,
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/plans', membershipController.getMembershipPlans);
router.post('/purchase', protect, membershipPurchaseLimiter, validateBody(membershipSchemas.purchaseMembership), membershipController.purchaseMembership);
router.post('/verify-payment', protect, membershipController.verifyPayment);
router.post('/webhook', membershipController.handlePaymentWebhook);
router.get('/status', protect, membershipController.getMembershipStatus);

export default router;
