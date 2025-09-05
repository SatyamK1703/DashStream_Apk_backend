import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Webhook route (no authentication required)
router.post('/webhook', paymentController.handleWebhook);

// Protected routes (require authentication)
router.use(protect);

// Create payment order
router.post('/create-order', paymentController.createPaymentOrder);

// Verify payment
router.post('/verify', paymentController.verifyPayment);

// Get user payments
router.get('/user', paymentController.getUserPayments);

// Get payment details
router.get('/:id', paymentController.getPayment);

// Initiate refund (admin only)
router.post('/:id/refund', paymentController.initiateRefund);

export default router;