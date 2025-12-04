import express from 'express';
import * as membershipController from '../controllers/membershipController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { membershipSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

router.get('/plans', membershipController.getMembershipPlans);
router.post('/purchase', protect, validateBody(membershipSchemas.purchaseMembership), membershipController.purchaseMembership);
router.post('/verify-payment', protect, membershipController.verifyPayment);
router.get('/status', protect, membershipController.getMembershipStatus);

export default router;
