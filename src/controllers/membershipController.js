import * as membershipService from '../services/membershipService.js';

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
