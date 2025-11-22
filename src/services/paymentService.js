import razorpayInstance, {
  getRazorpayKeyId,
  getWebhookSecret,
} from "../config/razorpay.js";
import Payment from "../models/paymentModel.js";
import Booking from "../models/bookingModel.js";
import { AppError } from "../utils/appError.js";
import crypto from "crypto";

//Create a new Razorpay order

export const createOrder = async (bookingId, userId, amount, notes = {}) => {
  try {
    // Validate booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Generate a unique receipt ID
    const receiptId = `receipt_${Date.now()}`;

    // Create order in Razorpay
    const orderOptions = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: receiptId,
      notes: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        ...notes,
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

    // Store payment record in database
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

//Verify payment signature

export const verifyPaymentSignature = async (orderId, paymentId, signature) => {
  try {
    // Find the payment record
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      throw new AppError("Payment record not found", 404);
    }

    // Generate signature verification string
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    // Verify signature
    const isValid = generatedSignature === signature;

    if (isValid) {
      // Update payment record
      payment.razorpayPaymentId = paymentId;
      payment.razorpaySignature = signature;
      payment.status = "captured";
      await payment.save();

      // Update booking status
      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: "paid",
      });
    }

    return isValid;
  } catch (error) {
    console.error("Error verifying payment signature:", error);
    throw new AppError(error.message || "Failed to verify payment", 500);
  }
};

//Verify webhook signature

export const verifyWebhookSignature = (signature, body) => {
  try {
    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      throw new Error("Webhook secret not configured");
    }

    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    return generatedSignature === signature;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
};

//Process webhook event

export const processWebhookEvent = async (event) => {
  try {
    const { payload } = event;
    const { payment, order } =
      payload.payment?.entity || payload.order?.entity || {};

    if (!order && !payment) {
      throw new Error("Invalid webhook payload");
    }

    const orderId = order?.id || payment?.order_id;
    if (!orderId) {
      throw new Error("Order ID not found in webhook payload");
    }

    // Find payment record
    const paymentRecord = await Payment.findOne({ razorpayOrderId: orderId });
    if (!paymentRecord) {
      throw new Error(`Payment record not found for order ID: ${orderId}`);
    }

    // Update payment status based on event type
    switch (event.event) {
      case "payment.authorized":
        paymentRecord.status = "authorized";
        paymentRecord.paymentMethod = payment?.method;
        paymentRecord.paymentDetails = payment;
        break;

      case "payment.captured":
        paymentRecord.status = "captured";
        paymentRecord.razorpayPaymentId = payment?.id;
        // Update booking status
        await Booking.findByIdAndUpdate(paymentRecord.bookingId, {
          paymentStatus: "paid",
        });
        break;

      case "payment.failed":
        paymentRecord.status = "failed";
        paymentRecord.errorCode = payment?.error_code;
        paymentRecord.errorDescription = payment?.error_description;
        break;

      case "refund.created":
        paymentRecord.refundId = payload.refund?.entity?.id;
        paymentRecord.refundAmount = payload.refund?.entity?.amount / 100;
        paymentRecord.refundStatus = "pending";
        break;

      case "refund.processed":
        paymentRecord.refundStatus = "processed";
        paymentRecord.status = "refunded";
        break;

      case "refund.failed":
        paymentRecord.refundStatus = "failed";
        break;
    }

    // Add webhook event to history
    paymentRecord.webhookEvents.push({
      eventId: event.id,
      eventType: event.event,
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

//Get payment details

export const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }
    return payment;
  } catch (error) {
    console.error("Error fetching payment details:", error);
    throw new AppError(error.message || "Failed to fetch payment details", 500);
  }
};

//Get payment details by Razorpay order ID

export const getPaymentByOrderId = async (orderId) => {
  try {
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }
    return payment;
  } catch (error) {
    console.error("Error fetching payment by order ID:", error);
    throw new AppError(error.message || "Failed to fetch payment details", 500);
  }
};

//Initiate refund

export const initiateRefund = async (paymentId, amount = null, notes = {}) => {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (!payment.razorpayPaymentId) {
      throw new AppError("Cannot refund a payment without payment ID", 400);
    }

    if (payment.status !== "captured") {
      throw new AppError(
        `Cannot refund a payment with status: ${payment.status}`,
        400
      );
    }

    // If amount not specified, refund full amount
    const refundAmount = amount ? amount * 100 : undefined;

    // Validate refund amount doesn't exceed available amount
    const totalRefunded = payment.refundAmount || 0;
    const availableAmount = payment.amount * 100 - totalRefunded;

    if (refundAmount && refundAmount > availableAmount) {
      throw new AppError(
        `Refund amount ₹${amount} exceeds available amount ₹${availableAmount / 100}`,
        400
      );
    }

    if (!refundAmount && availableAmount <= 0) {
      throw new AppError("No amount available for refund", 400);
    }

    // Create refund in Razorpay
    const refundOptions = {
      payment_id: payment.razorpayPaymentId,
      amount: refundAmount,
      notes: {
        paymentId: paymentId.toString(),
        bookingId: payment.bookingId.toString(),
        userId: payment.userId.toString(),
        ...notes,
      },
    };

    const refund = await razorpayInstance.payments.refund(refundOptions);

    // Update payment record
    payment.refundId = refund.id;
    payment.refundAmount = refund.amount / 100;
    payment.refundStatus = "pending";
    await payment.save();

    return refund;
  } catch (error) {
    console.error("Error initiating refund:", error);
    throw new AppError(error.message || "Failed to initiate refund", 500);
  }
};
