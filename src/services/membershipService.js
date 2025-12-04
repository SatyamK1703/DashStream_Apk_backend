import Membership from '../models/membershipModel.js';
import { createOrder } from './paymentService.js';
import crypto from 'crypto';
import razorpayInstance, { getRazorpayKeyId } from "../config/razorpay.js";
import { AppError } from "../utils/appError.js";

export const createMembershipOrder = async (planId, user, amount) => {
  try {
    const paymentLinkRequest = {
      amount: amount * 100,
      currency: "INR",
      accept_partial: false,
      description: "For Membership",
      customer: {
        name: user.name,
        email: user.email,
        contact: user.phone,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      notes: {
        planId: planId.toString(),
        userId: user.id.toString(),
      },
      callback_url: "https://dashstream.com/membership/success", // Replace with your actual success URL
      callback_method: "get",
    };

    const paymentLink = await razorpayInstance.paymentLink.create(paymentLinkRequest);

    console.log('Payment link created:', {
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.order_id,
      shortUrl: paymentLink.short_url
    });

    // Create membership record in database
    const membership = await createMembership(planId, user.id, paymentLink.order_id);

    console.log('Membership created:', {
      membershipId: membership._id,
      planId,
      userId: user.id,
      orderId: paymentLink.order_id
    });

    return {
      paymentLink: paymentLink.short_url,
      orderId: paymentLink.order_id,
      amount: amount,
      currency: "INR",
      membershipId: membership._id,
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