import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getAllPlans,
  getMembershipStatus,
  purchaseMembership,
  toggleAutoRenew,
  cancelMembership,
  getMembershipHistory,
  createPlan,
  updatePlan,
  getAllMemberships
} from '../controllers/membershipController.js';

const router = express.Router();

// Public routes
router.get('/plans', getAllPlans);

// Protected routes (require authentication)
router.get('/status', protect, getMembershipStatus);
router.post('/purchase', protect, purchaseMembership);
router.put('/auto-renew', protect, toggleAutoRenew);
router.post('/cancel', protect, cancelMembership);
router.get('/history', protect, getMembershipHistory);

// Admin routes
router.post('/plans', protect, createPlan);
router.put('/plans/:id', protect, updatePlan);
router.get('/admin/all', protect, getAllMemberships);

export default router;