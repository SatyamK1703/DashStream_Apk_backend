import * as paymentService from '../services/paymentService.js';
import AppError from '../utils/appError.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

/**
 * Create a payment order
 * @route POST /api/payments/create-order
 * @access Private
 */
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { bookingId, amount, notes } = req.body;
  
  if (!bookingId || !amount) {
    throw new AppError('Booking ID and amount are required', 400);
  }
  
  const userId = req.user._id;
  const orderData = await paymentService.createOrder(bookingId, userId, amount, notes);
  
  res.status(200).json({
    status: 'success',
    data: orderData
  });
});

/**
 * Verify payment
 * @route POST /api/payments/verify
 * @access Private
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError('Payment verification failed: Missing required parameters', 400);
  }
  
  const isValid = await paymentService.verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  
  if (!isValid) {
    throw new AppError('Payment verification failed: Invalid signature', 400);
  }
  
  const payment = await paymentService.getPaymentByOrderId(razorpay_order_id);
  
  res.status(200).json({
    status: 'success',
    message: 'Payment verified successfully',
    data: {
      payment
    }
  });
});

/**
 * Handle Razorpay webhook
 * @route POST /api/payments/webhook
 * @access Public
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    throw new AppError('Webhook verification failed: Missing signature', 400);
  }
  
  // Get raw body from request
  const rawBody = req.rawBody;
  
  // Verify webhook signature
  const isValid = paymentService.verifyWebhookSignature(signature, rawBody);
  
  if (!isValid) {
    throw new AppError('Webhook verification failed: Invalid signature', 400);
  }
  
  // Process webhook event
  const event = req.body;
  await paymentService.processWebhookEvent(event);
  
  // Always respond with 200 to Razorpay webhooks
  res.status(200).json({
    status: 'success',
    message: 'Webhook processed successfully'
  });
});

/**
 * Get payment details
 * @route GET /api/payments/:id
 * @access Private
 */
export const getPayment = asyncHandler(async (req, res) => {
  const paymentId = req.params.id;
  const payment = await paymentService.getPaymentDetails(paymentId);
  
  // Check if user has permission to view this payment
  if (req.user.role !== 'admin' && payment.userId.toString() !== req.user._id.toString()) {
    throw new AppError('You do not have permission to view this payment', 403);
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      payment
    }
  });
});

/**
 * Get user payments
 * @route GET /api/payments/user
 * @access Private
 */
export const getUserPayments = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const payments = await Payment.find({ userId })
    .sort({ createdAt: -1 })
    .populate('bookingId', 'serviceDate status');
  
  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});

/**
 * Initiate refund
 * @route POST /api/payments/:id/refund
 * @access Private (Admin only)
 */
export const initiateRefund = asyncHandler(async (req, res) => {
  const paymentId = req.params.id;
  const { amount, notes } = req.body;
  
  // Only admins can initiate refunds
  if (req.user.role !== 'admin') {
    throw new AppError('You do not have permission to initiate refunds', 403);
  }
  
  const refund = await paymentService.initiateRefund(paymentId, amount, notes);
  
  res.status(200).json({
    status: 'success',
    message: 'Refund initiated successfully',
    data: {
      refund
    }
  });
});