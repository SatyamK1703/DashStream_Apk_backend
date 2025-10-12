import Membership from '../models/membershipModel.js';
import { createOrder } from './paymentService.js';
import crypto from 'crypto';
import razorpayInstance, { getRazorpayKeyId } from "../config/razorpay.js";
import { AppError } from "../utils/appError.js";

export const createMembershipOrder = async (planId, userId, amount) => {
  try {
    const receiptId = `membership_receipt_${Date.now()}`;

    const orderOptions = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: receiptId,
      notes: {
        planId: planId.toString(),
        userId: userId.toString(),
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

    // Optionally, save a pending membership record here if needed
    // For now, we'll rely on verifyPayment to create the actual membership

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount / 100, // Return in original unit
      currency: razorpayOrder.currency,
    };
  } catch (error) {
    console.error("Error creating Razorpay membership order:", error);
    throw new AppError(error.message || "Failed to create membership order", 500);
  }
};

export const createMembership = async (planId, userId, orderId) => {
  const membership = new Membership({
    planId,
    userId,
    orderId,
  });

  await membership.save();

  return membership;
};

export const verifyPayment = async (orderId, paymentId, signature) => {
  const membership = await Membership.findOne({ orderId });

  if (!membership) {
    return null;
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

  if (expectedSignature === signature) {
    membership.paymentId = paymentId;
    membership.signature = signature;
    membership.status = 'active';
    membership.validUntil = new Date(new Date().setMonth(new Date().getMonth() + 1));
    await membership.save();
    return membership;
  } else {
    return null;
  }
};

export const getMembershipStatus = async (userId) => {
  const membership = await Membership.findOne({ userId, status: 'active' });
  return membership;
};