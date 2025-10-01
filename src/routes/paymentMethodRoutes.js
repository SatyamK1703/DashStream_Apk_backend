import express from "express";
import * as paymentMethodController from "../controllers/paymentMethodController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public route to get available payment methods
router.get("/", paymentMethodController.getPaymentMethods);

// Seed default payment methods (for development/setup)
router.post("/seed", paymentMethodController.seedPaymentMethods);

// Protected routes (require authentication)
router.use(protect);

// Admin only routes
router.use(restrictTo("admin"));

router.post("/", paymentMethodController.createPaymentMethod);
router.put("/:id", paymentMethodController.updatePaymentMethod);
router.delete("/:id", paymentMethodController.deletePaymentMethod);

export default router;