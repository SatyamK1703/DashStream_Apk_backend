import { MembershipPlan, UserMembership } from '../models/membershipModel.js';
import User from '../models/userModel.js';
import Payment from '../models/paymentModel.js';
import mongoose from 'mongoose';

// Get all active membership plans
export const getAllPlans = async (req, res, next) => {
  try {
    const plans = await MembershipPlan.find({ active: true }).sort('price');
    
    res.sendSuccess(
      plans,
      'Membership plans retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get membership status for current user
export const getMembershipStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Find active membership for user
    const membership = await UserMembership.findOne({
      userId,
      active: true,
      endDate: { $gte: new Date() }
    }).populate('planId');
    
    if (!membership) {
      return res.sendSuccess(
        {
          active: false,
          plan: '',
          validUntil: '',
          autoRenew: false,
          usedServices: 0,
          totalServices: 0,
          savings: 0
        },
        'User has no active membership'
      );
    }
    
    res.sendSuccess(
      {
        active: true,
        plan: membership.planId.name,
        validUntil: membership.endDate,
        autoRenew: membership.autoRenew,
        usedServices: membership.usedServices,
        totalServices: membership.totalServices,
        savings: membership.savings
      },
      'Membership status retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Purchase a membership plan
export const purchaseMembership = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { planId } = req.body;
    const userId = req.user._id;
    
    if (!planId) {
      return res.sendError('Plan ID is required', 400);
    }
    
    // Find the plan
    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.active) {
      return res.sendError('Invalid or inactive plan', 400);
    }
    
    // Check if user already has an active membership
    const existingMembership = await UserMembership.findOne({
      userId,
      active: true,
      endDate: { $gte: new Date() }
    });
    
    if (existingMembership) {
      // Deactivate existing membership
      existingMembership.active = false;
      existingMembership.cancellationDate = new Date();
      existingMembership.cancellationReason = 'Upgraded to new plan';
      await existingMembership.save({ session });
    }
    
    // Calculate end date based on plan duration
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);
    
    // Create a payment record (simplified for now)
    // In a real implementation, you would integrate with a payment gateway
    const payment = new Payment({
      bookingId: new mongoose.Types.ObjectId(), // Placeholder
      userId,
      amount: plan.price,
      currency: 'INR',
      razorpayOrderId: `order_${Date.now()}`, // Placeholder
      status: 'captured',
      paymentMethod: 'card',
      paymentDetails: { planId: plan._id }
    });
    
    await payment.save({ session });
    
    // Create new membership
    const newMembership = new UserMembership({
      userId,
      planId: plan._id,
      startDate,
      endDate,
      autoRenew: true,
      paymentId: payment._id,
      totalServices: plan.price >= 1000 ? 999 : (plan.price >= 500 ? 50 : 20) // Example logic
    });
    
    await newMembership.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.sendSuccess(
      {
        active: true,
        plan: plan.name,
        validUntil: endDate,
        autoRenew: true,
        usedServices: 0,
        totalServices: newMembership.totalServices,
        savings: 0
      },
      'Membership purchased successfully'
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// Toggle auto-renew setting
export const toggleAutoRenew = async (req, res, next) => {
  try {
    const { autoRenew } = req.body;
    const userId = req.user._id;
    
    if (typeof autoRenew !== 'boolean') {
      return res.sendError('autoRenew must be a boolean value', 400);
    }
    
    // Find active membership
    const membership = await UserMembership.findOne({
      userId,
      active: true,
      endDate: { $gte: new Date() }
    }).populate('planId');
    
    if (!membership) {
      return res.sendError('No active membership found', 404);
    }
    
    // Update auto-renew setting
    membership.autoRenew = autoRenew;
    await membership.save();
    
    res.sendSuccess(
      {
        active: true,
        plan: membership.planId.name,
        validUntil: membership.endDate,
        autoRenew: membership.autoRenew,
        usedServices: membership.usedServices,
        totalServices: membership.totalServices,
        savings: membership.savings
      },
      `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`
    );
  } catch (error) {
    next(error);
  }
};

// Cancel membership
export const cancelMembership = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { reason } = req.body;
    
    // Find active membership
    const membership = await UserMembership.findOne({
      userId,
      active: true,
      endDate: { $gte: new Date() }
    }).populate('planId');
    
    if (!membership) {
      return res.sendError('No active membership found', 404);
    }
    
    // Mark as inactive but keep access until end date
    membership.active = false;
    membership.autoRenew = false;
    membership.cancellationDate = new Date();
    membership.cancellationReason = reason || 'User cancelled';
    await membership.save();
    
    res.sendSuccess(
      {
        active: false,
        plan: membership.planId.name,
        validUntil: membership.endDate,
        autoRenew: false,
        usedServices: membership.usedServices,
        totalServices: membership.totalServices,
        savings: membership.savings
      },
      'Membership cancelled successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get membership history
export const getMembershipHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const memberships = await UserMembership.find({ userId })
      .populate('planId')
      .sort('-createdAt');
    
    const history = memberships.map(membership => ({
      id: membership._id,
      plan: membership.planId.name,
      price: membership.planId.price,
      startDate: membership.startDate,
      endDate: membership.endDate,
      active: membership.active && membership.endDate >= new Date(),
      autoRenew: membership.autoRenew,
      usedServices: membership.usedServices,
      totalServices: membership.totalServices,
      savings: membership.savings,
      cancelled: !!membership.cancellationDate,
      cancellationDate: membership.cancellationDate
    }));
    
    res.sendSuccess(
      history,
      'Membership history retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Admin: Create a new membership plan
export const createPlan = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized', 403);
    }
    
    const { name, price, duration, features, popular } = req.body;
    
    // Calculate duration in days
    let durationDays;
    switch (duration) {
      case 'monthly':
        durationDays = 30;
        break;
      case 'quarterly':
        durationDays = 90;
        break;
      case 'yearly':
        durationDays = 365;
        break;
      default:
        return res.sendError('Invalid duration', 400);
    }
    
    const plan = new MembershipPlan({
      name,
      price,
      duration,
      durationDays,
      features,
      popular: popular || false
    });
    
    await plan.save();
    
    res.sendSuccess(
      plan,
      'Membership plan created successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Admin: Update a membership plan
export const updatePlan = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized', 403);
    }
    
    const { id } = req.params;
    const { name, price, duration, features, popular, active } = req.body;
    
    const plan = await MembershipPlan.findById(id);
    if (!plan) {
      return res.sendError('Plan not found', 404);
    }
    
    // Update fields if provided
    if (name) plan.name = name;
    if (price !== undefined) plan.price = price;
    
    if (duration) {
      plan.duration = duration;
      
      // Update duration days
      switch (duration) {
        case 'monthly':
          plan.durationDays = 30;
          break;
        case 'quarterly':
          plan.durationDays = 90;
          break;
        case 'yearly':
          plan.durationDays = 365;
          break;
      }
    }
    
    if (features) plan.features = features;
    if (popular !== undefined) plan.popular = popular;
    if (active !== undefined) plan.active = active;
    
    await plan.save();
    
    res.sendSuccess(
      plan,
      'Membership plan updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Admin: Get all memberships (with pagination)
export const getAllMemberships = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized', 403);
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const memberships = await UserMembership.find()
      .populate('userId', 'name email phone')
      .populate('planId')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);
    
    const total = await UserMembership.countDocuments();
    
    res.sendSuccess(
      {
        memberships,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      },
      'Memberships retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};