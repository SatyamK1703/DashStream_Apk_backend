import * as membershipService from '../services/membershipService.js';

export const purchaseMembership = async (req, res) => {
  console.log('Request body:', req.body);
  const { planId, amount } = req.body;
  const user = req.user;

  try {
    const order = await membershipService.createMembershipOrder(planId, user, amount);
    res.status(201).json({
      success: true,
      status: 'success',
      message: 'Membership order created successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error in purchaseMembership controller:', error);
    res.status(500).json({ message: 'Error purchasing membership', error: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  try {
    const membership = await membershipService.verifyPayment(orderId, paymentId, signature);
    if (membership) {
      res.status(200).json(membership);
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error verifying payment', error });
  }
};

export const getMembershipStatus = async (req, res) => {
  const userId = req.user.id;

  try {
    const membership = await membershipService.getMembershipStatus(userId);
    if (membership) {
      res.status(200).json(membership);
    } else {
      res.status(404).json({ message: 'No active membership found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error getting membership status', error });
  }
};
