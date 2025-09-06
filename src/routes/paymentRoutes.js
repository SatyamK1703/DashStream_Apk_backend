import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { paymentSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Webhook route (no authentication required)
router.post('/webhook', paymentController.handleWebhook);

// Protected routes (require authentication)
router.use(protect);

// Create payment order
router.post('/create-order', validateBody(paymentSchemas.createOrder), paymentController.createPaymentOrder);

// Verify payment
router.post('/verify', validateBody(paymentSchemas.verifyPayment), paymentController.verifyPayment);

// Get user payments
router.get('/user', paymentController.getUserPayments);

// Get payment details
router.get('/:id', paymentController.getPayment);

// Initiate refund (admin only)
router.post('/:id/refund', paymentController.initiateRefund);

export default router;