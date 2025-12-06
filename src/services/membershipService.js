import Membership from '../models/membershipModel.js';
import { createOrder } from './paymentService.js';
import crypto from 'crypto';
import razorpayInstance, { getRazorpayKeyId } from "../config/razorpay.js";
import { AppError } from "../utils/appError.js";
import { MEMBERSHIP_PLANS } from '../config/membershipPlans.js';

export const createMembershipOrder = async (planId, user, amount, idempotencyKey = null) => {
  try {
    console.log('🔄 Creating membership order:', {
      planId,
      userId: user.id,
      amount,
      timestamp: new Date().toISOString()
    });

    // Check for existing active membership to prevent duplicates
    const existingMembership = await Membership.findOne({
      userId: user.id,
      planId,
      status: 'active',
      validUntil: { $gt: new Date() }
    });

    if (existingMembership) {
      console.warn('⚠️ Duplicate membership attempt blocked:', {
        userId: user.id,
        planId,
        existingMembershipId: existingMembership._id
      });
      throw new AppError('User already has an active membership for this plan', 409);
    }

    // First create an order
    const orderOptions = {
      amount: amount * 100, // amount in paisa
      currency: "INR",
      receipt: `receipt_membership_${Date.now()}`,
      notes: {
        planId: planId.toString(),
        userId: user.id.toString(),
      },
    };

    const order = await razorpayInstance.orders.create(orderOptions);
    console.log('✅ Order created:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });

    const paymentLinkRequest = {
      amount: amount * 100,
      currency: "INR",
      description: `Membership payment for plan ${planId}`,
      reference_id: order.id,
      expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Expire in 24 hours
      reminder_enable: true,
      notes: {
        planId: planId.toString(),
        userId: user.id.toString(),
      },
    };

    console.log('🔗 Creating payment link with options:', {
      amount: paymentLinkRequest.amount,
      currency: paymentLinkRequest.currency,
      expire_by: new Date(paymentLinkRequest.expire_by * 1000).toISOString()
    });

    const paymentLink = await razorpayInstance.paymentLink.create(paymentLinkRequest);

    console.log('✅ Payment link created:', {
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.order_id || order.id,
      shortUrl: paymentLink.short_url,
      expiresAt: paymentLink.expire_by ? new Date(paymentLink.expire_by * 1000).toISOString() : null
    });

    // Create membership record in database
    const membership = await createMembership(planId, user.id, order.id, paymentLink.id);

    console.log('Membership created:', {
      membershipId: membership._id,
      planId,
      userId: user.id,
      orderId: order.id
    });

    return {
      paymentLink: paymentLink.short_url,
      id: order.id,
      amount: amount,
      currency: "INR",
      membershipId: membership._id,
    };
  } catch (error) {
    console.error("Error creating Razorpay membership order:", error);
    throw new AppError(error.message || "Failed to create membership order", 500);
  }
};

export const createMembership = async (planId, userId, orderId, paymentLinkId = null) => {
  const membership = new Membership({
    planId,
    userId,
    orderId,
    paymentLinkId,
  });

  await membership.save();

  return membership;
};

export const verifyPayment = async (paymentLinkId, paymentId, signature) => {
  console.log('🔍 Verifying payment:', {
    paymentLinkId,
    paymentId,
    timestamp: new Date().toISOString()
  });

  const membership = await Membership.findOne({ paymentLinkId });

  if (!membership) {
    console.error('❌ Membership not found for payment verification:', { paymentLinkId });
    return null;
  }

  // Prevent duplicate verification
  if (membership.status === 'active') {
    console.log('⚠️ Payment already verified:', { membershipId: membership._id });
    return membership;
  }

  const body = `${paymentLinkId}|${paymentId}`;
  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

  if (expectedSignature === signature) {
    membership.paymentId = paymentId;
    membership.signature = signature;
    membership.status = 'active';
    membership.validUntil = new Date(new Date().setMonth(new Date().getMonth() + 1));
    await membership.save();

    console.log('✅ Payment verified successfully:', {
      membershipId: membership._id,
      userId: membership.userId,
      planId: membership.planId,
      validUntil: membership.validUntil
    });

    return membership;
  } else {
    console.error('❌ Invalid payment signature:', { paymentLinkId, paymentId });
    return null;
  }
};

export const getMembershipStatus = async (userId) => {
  const membership = await Membership.findOne({ userId, status: 'active' });
  return membership;
};

export const getMembershipPlans = async () => {
  return MEMBERSHIP_PLANS;
};