/* eslint-env node */
/* global console, process */
import { Buffer } from "buffer";
import razorpayInstance, {
  getRazorpayKeyId,
  getWebhookSecret,
} from "../config/razorpay.js";
import Payment from "../models/paymentModel.js";
import Booking from "../models/bookingModel.js";
import Membership from "../models/membershipModel.js";
import { AppError } from "../utils/appError.js";
import crypto from "crypto";
import { asyncHandler } from "../middleware/errorMiddleware.js";
import * as paymentService from "../services/paymentService.js";

// Timing-safe compare helper
const safeCompare = (a = "", b = "") => {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    return false;
  }
};

// Create a new Razorpay order
export const createOrder = async (bookingId, userId, amount, notes = {}) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError("Booking not found", 404);

    // Validate booking ownership
    if (booking.customer.toString() !== userId.toString()) {
      throw new AppError("You can only create payments for your own bookings", 403);
    }

    // Validate payment amount matches booking total
    if (Math.abs(Number(amount) - Number(booking.totalAmount)) > 0.01) {
      throw new AppError(`Payment amount must match booking total of ₹${booking.totalAmount}`, 400);
    }

    // Check for existing payments on this booking
    const existingPayment = await Payment.findOne({
      bookingId,
      status: { $in: ['created', 'pending', 'authorized', 'captured'] }
    });

    if (existingPayment) {
      throw new AppError("A payment already exists for this booking", 409);
    }

    const receiptId = `receipt_${Date.now()}`;
    const paise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(paise) || paise <= 0)
      throw new AppError("Invalid amount", 400);

    const orderOptions = {
      amount: paise,
      currency: "INR",
      receipt: receiptId,
      notes: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        ...notes,
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

    const payment = await Payment.create({
      bookingId,
      userId,
      amount,
      currency: "INR",
      razorpayOrderId: razorpayOrder.id,
      status: "created",
      receiptId,
      notes,
    });

    return {
      paymentId: payment._id,
      order: razorpayOrder,
      key: getRazorpayKeyId(),
    };
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw new AppError(error.message || "Failed to create payment order", 500);
  }
};

// Create a new Razorpay payment link for web-based checkout
export const createPaymentLink = async (
  bookingId,
  userId,
  amount,
  notes = {}
) => {
  try {
    const booking = await Booking.findById(bookingId).populate(
      "customer",
      "name email phone"
    );
    if (!booking) throw new AppError("Booking not found", 404);

    const customer = booking.customer || {};
    const paymentLinkOptions = {
      amount: Math.round(Number(amount) * 100), // in paise
      currency: "INR",
      accept_partial: false,
      description: `Payment for booking ${bookingId}`,
      customer: {
        name: customer.name || "Customer",
        email: customer.email || "noemail@example.com",
        contact: customer.phone || "9999999999",
      },
      notify: {
        sms: true,
        email: true,
      },
      // Optionally set a callback_url for post-payment redirect
      // callback_url: "https://your-frontend-url.com/payment-callback",
      // callback_method: "get",
      notes: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        ...notes,
      },
    };

    const paymentLink = await razorpayInstance.paymentLink.create(
      paymentLinkOptions
    );

    // Check if payment already exists for this booking
    let existingPayment = await Payment.findOne({ 
      bookingId, 
      status: { $in: ['created', 'pending', 'authorized'] } 
    });

    if (existingPayment && existingPayment.razorpayPaymentLinkId) {
      // Return existing payment link if it's still valid
      try {
        const existingLink = await razorpayInstance.paymentLink.fetch(existingPayment.razorpayPaymentLinkId);
        if (existingLink && existingLink.status === 'created') {
          return {
            paymentId: existingPayment._id,
            payment_link: existingLink.short_url,
            paymentLinkId: existingLink.id,
            key: getRazorpayKeyId(),
          };
        }
      } catch (linkError) {
        console.log('Existing payment link not valid, creating new one');
      }
    }

    // Optionally, store the payment link ID in your Payment model for tracking
    const payment = existingPayment || await Payment.create({
      bookingId,
      userId,
      amount,
      currency: "INR",
      status: "created",
      notes,
    });

    // Update payment record with payment link details
    if (!existingPayment) {
      payment.razorpayPaymentLinkId = paymentLink.id;
      await payment.save();
    } else {
      await Payment.findByIdAndUpdate(existingPayment._id, {
        razorpayPaymentLinkId: paymentLink.id,
        status: 'created',
        amount: amount, // Update amount in case it changed
        notes: notes
      });
    }

    return {
      paymentId: payment._id,
      payment_link: paymentLink.short_url, // or paymentLink.payment_url
      paymentLinkId: paymentLink.id,
      key: getRazorpayKeyId(),
    };
  } catch (error) {
    console.error("Error creating Razorpay payment link:", error);
    
    // Handle MongoDB duplicate key errors specifically
    if (error.code === 11000) {
      const message = "A payment for this booking already exists. Please check your existing orders.";
      throw new AppError(message, 409, "DUPLICATE_PAYMENT");
    }
    
    throw new AppError(error.message || "Failed to create payment link", 500);
  }
};

// Verify payment signature (timing-safe)
export const verifyPaymentSignature = async (orderId, paymentId, signature) => {
  try {
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) throw new AppError("Payment record not found", 404);

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new AppError("Razorpay secret not configured", 500);

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isValid = safeCompare(generatedSignature, signature);

    if (isValid) {
      // Idempotency check - if already captured, just return success
      if (payment.status === "captured") {
        return true;
      }

      payment.razorpayPaymentId = paymentId;
      payment.razorpaySignature = signature;
      payment.status = "captured";
      payment.capturedAt = new Date();
      await payment.save();

      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: "paid",
        paymentId: payment._id,
      });
    }

    return isValid;
  } catch (error) {
    console.error("Error verifying payment signature:", error);
    throw new AppError(error.message || "Failed to verify payment", 500);
  }
};

// Verify webhook signature (timing-safe)
export const verifyWebhookSignature = (signature, body) => {
  try {
    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return false;
    }

    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    return safeCompare(generatedSignature, signature);
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
};

// Process webhook event with idempotency
export const processWebhookEvent = async (event) => {
  try {
    // Basic payload normalization
    const eventId = event?.id || `${event?.account_id}_${event?.created_at}`;
    const eventType = event?.event;
    const payload = event?.payload ?? {};
    const createdAt = event?.created_at;

    if (!eventId || !eventType) {
      throw new Error(`Invalid webhook event: missing required fields 'id' and/or 'event'. Received: ${JSON.stringify(event).substring(0, 200)}`);
    }

    // Security: Check if webhook event is not too old (prevent replay attacks)
    if (createdAt) {
      const eventTime = new Date(createdAt * 1000); // createdAt is in seconds, convert to milliseconds
      const now = new Date();
      const timeDiff = now - eventTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const maxFuture = 5 * 60 * 1000; // 5 minutes in future (allow for clock skew)

      if (timeDiff > maxAge || timeDiff < -maxFuture) {
        console.warn(`Webhook event ${eventId} is too old or has future timestamp: ${timeDiff}ms`);
        return null;
      }
    }

    // Try to find order/payment id from payload
    const orderEntity = payload.order?.entity;
    const paymentEntity = payload.payment?.entity;
    const orderId =
      orderEntity?.id || paymentEntity?.order_id || paymentEntity?.id;

    if (!orderId) {
      // For some events, order id may be in different places
      // Attempt to find by searching for any razorpay order id inside payload
      const maybeOrderId = JSON.stringify(payload).match(/order_[a-zA-Z0-9]+/);
      if (maybeOrderId) event.orderId = maybeOrderId[0];
    }

    // Find the payment record by razorpayOrderId OR by razorpayPaymentId
    let paymentRecord = null;
    if (orderId)
      paymentRecord = await Payment.findOne({ razorpayOrderId: orderId });
    if (!paymentRecord && paymentEntity?.id)
      paymentRecord = await Payment.findOne({
        razorpayPaymentId: paymentEntity.id,
      });

    // Additional fallback: try to find by bookingId from notes
    if (!paymentRecord && paymentEntity?.notes?.bookingId) {
      paymentRecord = await Payment.findOne({
        bookingId: paymentEntity.notes.bookingId
      });
    }

    // Check for Membership record if no Payment record found
    let membershipRecord = null;
    if (!paymentRecord) {
      // First try to find by orderId with various formats
      if (orderId) {
        console.log(`Looking for membership with orderId: ${orderId}`);

        // Try to find membership with the orderId as-is
        membershipRecord = await Membership.findOne({ orderId });
        console.log(`Found membership with exact orderId ${orderId}: ${!!membershipRecord}`);

        // If not found and orderId starts with "order_", try without prefix
        if (!membershipRecord && orderId.startsWith('order_')) {
          const orderIdWithoutPrefix = orderId.substring(6); // Remove "order_" prefix
          console.log(`Trying orderId without prefix: ${orderIdWithoutPrefix}`);
          membershipRecord = await Membership.findOne({ orderId: orderIdWithoutPrefix });
          console.log(`Found membership with orderId ${orderIdWithoutPrefix}: ${!!membershipRecord}`);
        }

        // If not found and orderId doesn't start with "order_", try with prefix
        if (!membershipRecord && !orderId.startsWith('order_')) {
          const orderIdWithPrefix = `order_${orderId}`;
          console.log(`Trying orderId with prefix: ${orderIdWithPrefix}`);
          membershipRecord = await Membership.findOne({ orderId: orderIdWithPrefix });
          console.log(`Found membership with orderId ${orderIdWithPrefix}: ${!!membershipRecord}`);
        }
      }

      // If still not found, try to find by userId and planId from notes
      if (!membershipRecord && (paymentEntity?.notes?.userId && paymentEntity?.notes?.planId)) {
        const { userId, planId } = paymentEntity.notes;
        console.log(`Trying to find membership by userId ${userId} and planId ${planId}`);
        membershipRecord = await Membership.findOne({
          userId,
          planId,
          status: { $in: ['pending', 'active'] } // Look for pending or active memberships
        });
        console.log(`Found membership by userId and planId: ${!!membershipRecord}`);
      }

      // Also try order entity notes if payment entity notes don't work
      if (!membershipRecord && (orderEntity?.notes?.userId && orderEntity?.notes?.planId)) {
        const { userId, planId } = orderEntity.notes;
        console.log(`Trying to find membership by order entity userId ${userId} and planId ${planId}`);
        membershipRecord = await Membership.findOne({
          userId,
          planId,
          status: { $in: ['pending', 'active'] }
        });
        console.log(`Found membership by order entity userId and planId: ${!!membershipRecord}`);
      }
    }

    if (!paymentRecord && !membershipRecord) {
      // If no record, log detailed info and return gracefully
      console.error(
        `Payment record not found for webhook ${eventId}:`, {
          orderId,
          paymentId: paymentEntity?.id,
          bookingIdFromNotes: paymentEntity?.notes?.bookingId,
          eventType,
          payload: JSON.stringify(payload).substring(0, 500)
        }
      );
      return null;
    }

    // Log what we found
    if (membershipRecord) {
      console.log(`Found membership record: membershipId ${membershipRecord._id}, userId ${membershipRecord.userId}, planId ${membershipRecord.planId}, orderId ${membershipRecord.orderId}, status ${membershipRecord.status}`);
    }

    // Idempotency: skip if we've already processed this event id
    let alreadyProcessed = false;
    if (paymentRecord) {
      alreadyProcessed = (paymentRecord.webhookEvents || []).some(
        (e) => e.eventId === eventId
      );
    } else if (membershipRecord) {
      // For memberships found by userId/planId, we can't check eventId since we don't store webhook events
      // So we use simple idempotency based on status
      alreadyProcessed = membershipRecord.status === 'active' && eventType === 'payment.captured';
    }
    if (alreadyProcessed) {
      console.log(`Webhook event ${eventId} already processed for ${paymentRecord ? 'payment' : 'membership'} record`);
      return paymentRecord || membershipRecord;
    }

    // Update payment status based on event type
    if (paymentRecord) {
      switch (eventType) {
        case "payment.authorized":
          paymentRecord.status = "authorized";
          paymentRecord.paymentMethod = paymentEntity?.method;
          paymentRecord.paymentDetails = paymentEntity;
          break;
        case "payment.captured":
          paymentRecord.status = "captured";
          paymentRecord.razorpayPaymentId =
            paymentEntity?.id || paymentRecord.razorpayPaymentId;
          paymentRecord.capturedAt = new Date();
          await Booking.findByIdAndUpdate(paymentRecord.bookingId, {
            paymentStatus: "paid",
            paymentId: paymentRecord._id,
          });
          break;
        case "payment.failed":
          paymentRecord.status = "failed";
          paymentRecord.errorCode = paymentEntity?.error_code;
          paymentRecord.errorDescription = paymentEntity?.error_description;
          break;
        case "refund.created":
          paymentRecord.refundId = payload.refund?.entity?.id;
          paymentRecord.refundAmount =
            (payload.refund?.entity?.amount ?? 0) / 100;
          paymentRecord.refundStatus = "pending";
          break;
        case "refund.processed":
          paymentRecord.refundStatus = "processed";
          paymentRecord.status = "refunded";
          break;
        case "refund.failed":
          paymentRecord.refundStatus = "failed";
          break;
        default:
          // Keep record of unknown events for audit
          break;
      }
    }

    // Handle membership activation
    if (membershipRecord) {
      switch (eventType) {
        case "payment.captured":
          membershipRecord.status = "active";
          membershipRecord.paymentId = paymentEntity?.id;
          membershipRecord.validUntil = new Date(new Date().setMonth(new Date().getMonth() + 1));
          await membershipRecord.save();
          console.log(`Membership activated for user ${membershipRecord.userId}, plan: ${membershipRecord.planId}`);
          break;
        case "payment.failed":
          membershipRecord.status = "failed";
          await membershipRecord.save();
          break;
        default:
          // Keep record of other events for audit
          break;
      }
    }

    // Append webhook event with idempotent metadata
    if (paymentRecord) {
      paymentRecord.webhookEvents = paymentRecord.webhookEvents || [];
      paymentRecord.webhookEvents.push({
        eventId,
        eventType,
        timestamp: new Date(),
        payload: event,
      });
      await paymentRecord.save();
      return paymentRecord;
    }

    if (membershipRecord) {
      // For memberships, we don't store webhook events in the model currently
      // but we could add this if needed for audit purposes
      console.log(`Membership webhook processed: ${eventType} for membership ${membershipRecord._id}`);
      return membershipRecord;
    }
  } catch (error) {
    console.error("Error processing webhook event:", error);
    throw new AppError(error.message || "Failed to process webhook event", 500);
  }
};

// --- Express route handlers expected by routes/paymentRoutes.js ---

export const handleWebhook = asyncHandler(async (req, res) => {
  // Razorpay sends signature in 'x-razorpay-signature'
  const signature =
    req.headers["x-razorpay-signature"] ||
    req.headers["x-razorpay-signature".toLowerCase()];
  const rawBody = req.rawBody || (req.body ? JSON.stringify(req.body) : "");

  console.log("Webhook received:", {
    signature: signature ? "present" : "missing",
    bodyLength: rawBody.length,
    eventType: req.body?.event,
    eventId: req.body?.id
  });

  const verified = verifyWebhookSignature(signature, rawBody);
  if (!verified) {
    console.error("Webhook signature verification failed:", {
      signaturePresent: !!signature,
      bodyLength: rawBody.length,
      webhookSecretConfigured: !!getWebhookSecret()
    });
    return res
      .status(400)
      .json({ status: "error", message: "Invalid webhook signature" });
  }

  const event = req.body;
  const result = await processWebhookEvent(event);
  
  console.log("Webhook processed:", {
    eventId: event?.id,
    eventType: event?.event,
    processed: !!result
  });
  
  return res.status(200).json({ status: "success" });
});

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { bookingId, amount, notes } = req.body || {};
  if (!bookingId || !amount) {
    throw new AppError("Missing bookingId or amount", 400);
  }

  const result = await createOrder(bookingId, req.user.id, amount, notes);
  res.status(201).json({ status: "success", data: result });
});

export const createPaymentLinkOrder = asyncHandler(async (req, res) => {
  const { bookingId, amount, notes } = req.body || {};
  if (!bookingId || !amount) {
    throw new AppError("Missing bookingId or amount", 400);
  }

  const result = await createPaymentLink(bookingId, req.user.id, amount, notes);
  res.status(201).json({ status: "success", data: result });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature, bookingId } = req.body || {};
  if (!orderId || !paymentId || !signature) {
    throw new AppError("Missing orderId, paymentId or signature", 400);
  }

  const valid = await verifyPaymentSignature(orderId, paymentId, signature);
  if (!valid) throw new AppError("Invalid payment signature", 400);

  // Fetch updated payment and booking data
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  const booking = await Booking.findById(payment.bookingId).populate('customer', 'name email phone');

  res.status(200).json({
    status: "success",
    data: {
      verified: true,
      payment,
      booking
    }
  });
});

// Manual payment verification fallback
export const manualVerifyPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.body || {};
  if (!bookingId) {
    throw new AppError("Missing bookingId", 400);
  }

  // Validate booking ownership
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (req.user.role !== 'admin' && booking.customer.toString() !== req.user.id.toString()) {
    throw new AppError("You can only verify payments for your own bookings", 403);
  }

  const payment = await Payment.findOne({ bookingId });
  if (!payment) {
    throw new AppError("Payment record not found", 404);
  }

  // If payment is already captured, update booking
  if (payment.status === 'captured') {
    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: "paid",
      paymentId: payment._id,
    });
    
    res.status(200).json({ 
      status: "success", 
      message: "Payment status synchronized",
      paymentStatus: payment.status,
      bookingPaymentStatus: "paid"
    });
  } else {
    res.status(200).json({ 
      status: "info", 
      message: "Payment not yet captured",
      paymentStatus: payment.status
    });
  }
});

export const getUserPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ userId: req.user.id }).sort(
    "-createdAt"
  );
  res
    .status(200)
    .json({ status: "success", results: payments.length, payments });
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new AppError("Payment not found", 404);

  // Check ownership - allow admins to access any payment
  if (req.user.role !== 'admin' && payment.userId.toString() !== req.user.id.toString()) {
    throw new AppError("You can only access your own payment details", 403);
  }

  res.status(200).json({ status: "success", payment });
});

export const initiateRefund = asyncHandler(async (req, res) => {
  const paymentId = req.params.id;
  const { amount, notes } = req.body || {};
  const refund = await paymentService.initiateRefund(paymentId, amount, notes);
  res.status(200).json({ status: "success", refund });
});

// COD-specific functions

// Create COD payment record for tracking
export const createCODPayment = async (bookingId, userId, amount, notes = {}) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError("Booking not found", 404);

    // Create COD payment record
    const payment = await Payment.create({
      bookingId,
      userId,
      amount,
      currency: "INR",
      status: "cod_pending",
      paymentMethod: "cod",
      notes: {
        ...notes,
        codCreatedAt: new Date(),
        bookingId: bookingId.toString(),
      }
    });

    return {
      paymentId: payment._id,
      codStatus: 'pending',
      amount: amount,
      message: 'COD payment record created'
    };
  } catch (error) {
    console.error("Error creating COD payment:", error);
    throw new AppError(error.message || "Failed to create COD payment", 500);
  }
};

// Mark COD as collected by professional
export const collectCODPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { amount, notes } = req.body;
  
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }
  
  // Verify that the current user is the assigned professional
  if (!booking.professional || booking.professional.toString() !== req.user.id) {
    throw new AppError("You are not authorized to collect payment for this booking", 403);
  }

  // Validate booking status allows COD collection
  if (!['completed', 'in_progress'].includes(booking.status)) {
    throw new AppError("COD can only be collected for active or completed bookings", 400);
  }

  // Update booking COD status
  booking.codStatus = 'collected';
  booking.codCollectedAt = new Date();
  booking.codCollectedBy = req.user.id;
  booking.paymentStatus = 'paid';
  
  if (notes) {
    booking.completionNotes = notes;
  }
  
  // Add tracking update
  booking.trackingUpdates.push({
    status: booking.status,
    message: `Payment of ₹${amount} collected via COD`,
    updatedBy: req.user.id,
    timestamp: new Date(),
  });
  
  await booking.save();
  
  // Update payment record if exists
  const payment = await Payment.findOne({ bookingId });
  if (payment) {
    payment.status = 'cod_collected';
    payment.capturedAt = new Date();
    payment.paymentDetails = {
      collectedBy: req.user.id,
      collectedAt: new Date(),
      collectionNotes: notes
    };
    await payment.save();
  }
  
  res.status(200).json({
    status: "success",
    data: {
      booking,
      message: "COD payment collected successfully"
    }
  });
});

// Mark COD collection as failed
export const failCODPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;
  
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }
  
  // Verify that the current user is the assigned professional
  if (!booking.professional || booking.professional.toString() !== req.user.id) {
    throw new AppError("You are not authorized to update payment for this booking", 403);
  }
  
  // Update booking COD status
  booking.codStatus = 'failed';
  booking.paymentStatus = 'failed';
  
  // Add tracking update
  booking.trackingUpdates.push({
    status: booking.status,
    message: `COD payment failed: ${reason || 'No reason provided'}`,
    updatedBy: req.user.id,
    timestamp: new Date(),
  });
  
  await booking.save();
  
  // Update payment record if exists
  const payment = await Payment.findOne({ bookingId });
  if (payment) {
    payment.status = 'failed';
    payment.errorDescription = reason || 'COD collection failed';
    await payment.save();
  }
  
  res.status(200).json({
    status: "success",
    data: {
      booking,
      message: "COD payment marked as failed"
    }
  });
});

// Create COD payment record (route handler)
export const createCODPaymentOrder = asyncHandler(async (req, res) => {
  const { bookingId, amount, notes } = req.body || {};
  if (!bookingId || !amount) {
    throw new AppError("Missing bookingId or amount", 400);
  }

  const result = await createCODPayment(bookingId, req.user.id, amount, notes);
  res.status(201).json({ status: "success", data: result });
});
