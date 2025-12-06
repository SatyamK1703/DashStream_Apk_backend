import * as membershipService from '../services/membershipService.js';
import crypto from 'crypto';
import Membership from '../models/membershipModel.js';

export const purchaseMembership = async (req, res) => {
  console.log('Request body:', req.body);
  const { planId, amount } = req.body;
  const user = req.user;

  try {
    const order = await membershipService.createMembershipOrder(planId, user, amount);
    res.sendSuccess(order, 'Membership order created successfully', 201);
  } catch (error) {
    console.error('Error in purchaseMembership controller:', error);
    res.sendError('Error purchasing membership', 500);
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpay_payment_link_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const membership = await membershipService.verifyPayment(razorpay_payment_link_id, razorpay_payment_id, razorpay_signature);
    if (membership) {
      res.sendSuccess(membership, 'Payment verified successfully');
    } else {
      res.sendBadRequest('Invalid payment signature');
    }
  } catch (error) {
    res.sendError('Error verifying payment', 500);
  }
};

// Webhook for automatic payment verification
export const handlePaymentWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    if (event === 'payment.captured') {
      // Find membership by payment ID
      const membership = await Membership.findOne({ paymentId: paymentEntity.id });

      if (membership && membership.status !== 'active') {
        membership.status = 'active';
        membership.validUntil = new Date(new Date().setMonth(new Date().getMonth() + 1));
        await membership.save();

        console.log('Membership activated via webhook:', membership._id);
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

export const getMembershipStatus = async (req, res) => {
  const userId = req.user.id;

  try {
    const membership = await membershipService.getMembershipStatus(userId);
    if (membership) {
      // Format the response to match frontend expectations
      const formattedMembership = {
        active: membership.status === 'active',
        plan: membership.planId,
        validUntil: membership.validUntil ? membership.validUntil.toISOString().split('T')[0] : null,
        autoRenew: membership.autoRenew || false,
        usedServices: 0, // TODO: Implement service usage tracking
        totalServices: membership.planId === 'silver' ? 4 : membership.planId === 'gold' ? 8 : 12, // Basic mapping
        savings: 0, // TODO: Implement savings calculation
      };
      res.sendSuccess(formattedMembership, 'Membership status retrieved successfully');
    } else {
      res.sendNotFound('No active membership found');
    }
  } catch (error) {
    res.sendError('Error getting membership status', 500);
  }
};

export const getMembershipPlans = async (req, res) => {
  try {
    const plans = await membershipService.getMembershipPlans();
    res.sendSuccess(plans, 'Membership plans retrieved successfully');
  } catch (error) {
    res.sendError('Error getting membership plans', 500);
  }
};
