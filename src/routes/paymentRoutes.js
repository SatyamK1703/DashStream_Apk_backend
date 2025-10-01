import express from "express";
import * as paymentController from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";
import { validateBody } from "../middleware/validationMiddleware.js";
import { paymentSchemas } from "../schemas/validationSchemas.js";

const router = express.Router();

// Webhook route is handled at app level with express.raw for signature verification

// Protected routes (require authentication)
router.use(protect);

// Create payment order
router.post(
  "/create-order",
  validateBody(paymentSchemas.createOrder),
  paymentController.createPaymentOrder
);

// Create payment link for web-based checkout
router.post(
  "/create-payment-link",
  validateBody(paymentSchemas.createOrder),
  paymentController.createPaymentLinkOrder
);

// Create COD payment record
router.post(
  "/create-cod",
  validateBody(paymentSchemas.createOrder),
  paymentController.createCODPaymentOrder
);

// COD collection routes
router.post("/cod/:bookingId/collect", paymentController.collectCODPayment);
router.post("/cod/:bookingId/fail", paymentController.failCODPayment);

// Verify payment
router.post(
  "/verify",
  validateBody(paymentSchemas.verifyPayment),
  paymentController.verifyPayment
);

// Get user payments
router.get("/user", paymentController.getUserPayments);

// Get payment details
router.get("/:id", paymentController.getPayment);

// Initiate refund (admin only)
router.post("/:id/refund", paymentController.initiateRefund);

export default router;
