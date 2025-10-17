import express from 'express';
import * as membershipController from '../controllers/membershipController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/purchase', protect, membershipController.purchaseMembership);
router.post('/verify-payment', protect, membershipController.verifyPayment);
router.get('/status', protect, membershipController.getMembershipStatus);

export default router;
