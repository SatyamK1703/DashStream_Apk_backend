import razorpayInstance, {
  getRazorpayKeyId,
  getWebhookSecret,
} from "../config/razorpay.js";
import Payment from "../models/paymentModel.js";
import Booking from "../models/bookingModel.js";
import AppError from "../utils/appError.js";
import crypto from "crypto";

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
    const eventId = event?.id;
    const eventType = event?.event;
    const payload = event?.payload ?? {};

    if (!eventId || !eventType) {
      throw new Error("Invalid webhook event");
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

    if (!paymentRecord) {
      // If no record, log and return gracefully; webhook may arrive before DB record is created
      console.warn(
        `Payment record not found for order: ${orderId}. Webhook ${eventId} will be skipped.`
      );
      return null;
    }

    // Idempotency: skip if we've already processed this event id
    const alreadyProcessed = (paymentRecord.webhookEvents || []).some(
      (e) => e.eventId === eventId
    );
    if (alreadyProcessed) return paymentRecord;

    // Update payment status based on event type
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

    // Append webhook event with idempotent metadata
    paymentRecord.webhookEvents = paymentRecord.webhookEvents || [];
    paymentRecord.webhookEvents.push({
      eventId,
      eventType,
      timestamp: new Date(),
      payload: event,
    });

    await paymentRecord.save();
    return paymentRecord;
  } catch (error) {
    console.error("Error processing webhook event:", error);
    throw new AppError(error.message || "Failed to process webhook event", 500);
  }
};
