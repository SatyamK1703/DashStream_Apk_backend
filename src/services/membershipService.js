import Membership from '../models/membershipModel.js';
import { createOrder } from './paymentService.js';
import crypto from 'crypto';


export const createMembershipOrder = async (planId, userId, amount) => {
  const notes = { planId };
  const order = await createOrder(null, userId, amount, notes);
  return order;
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
