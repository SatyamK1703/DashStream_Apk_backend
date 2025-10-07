import Offer from "../models/offerModel.js";
import Service from "../models/serviceModel.js";
import { asyncHandler, AppError } from "../middleware/errorMiddleware.js";
import mongoose from "mongoose";

// GET /api/offers - Get all offers with filtering
export const getAllOffers = asyncHandler(async (req, res, next) => {
  // Build query
  let query = Offer.find();
  
  // Filter by active status (default to active only)
  if (req.query.showInactive !== 'true') {
    query = query.find({ isActive: true });
  }
  
  // Filter by validity (default to valid offers only)
  if (req.query.showExpired !== 'true') {
    const now = new Date();
    query = query.find({
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    });
  }
  
  // Filter by featured status
  if (req.query.featured === 'true') {
    query = query.find({ isFeatured: true });
  }
  
  // Filter by vehicle type
  if (req.query.vehicleType) {
    query = query.find({ 
      $or: [
        { vehicleType: req.query.vehicleType },
        { vehicleType: 'Both' }
      ]
    });
  }
  
  // Filter by category
  if (req.query.category) {
    query = query.find({ applicableCategories: req.query.category });
  }
  
  // Filter by minimum discount
  if (req.query.minDiscount) {
    query = query.find({ discount: { $gte: parseInt(req.query.minDiscount) } });
  }
  
  // Search by title or description
  if (req.query.search) {
    query = query.find({
      $or: [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { offerCode: { $regex: req.query.search, $options: 'i' } }
      ]
    });
  }
  
  // Sort offers
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    // Default sort: priority desc, featured desc, created desc
    query = query.sort('-priority -isFeatured -createdAt');
  }
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  query = query.skip(skip).limit(limit);
  
  // Populate related data
  query = query.populate('createdBy', 'name email')
               .populate('applicableServices', 'title price category');
  
  // Execute query
  const offers = await query;
  
  // Get total count for pagination
  const totalCount = await Offer.countDocuments();
  
  res.status(200).json({
    status: 'success',
    results: offers.length,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    offers
  });
});

// GET /api/offers/active - Get only active and valid offers
export const getActiveOffers = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  
  // Build filter object
  const offers = await Offer.getActiveOffers(filters)
    .limit(limit)
  res.status(200).json({
    status: 'success',
    results: offers.length,
    offers
  });
});

// GET /api/offers/featured - Get featured offers
export const getFeaturedOffers = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 5;
  
  const offers = await Offer.getActiveOffers({ isFeatured: true })
    .limit(limit)
    .populate('applicableServices', 'title price category');
  
  res.status(200).json({
    status: 'success',
    results: offers.length,
    offers
  });
});

// GET /api/offers/:id - Get single offer
export const getOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('applicableServices', 'title price category description')
    .populate('usedBy.user', 'name email');
  
  if (!offer) {
    return next(new AppError('No offer found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    offer
  });
});

// POST /api/offers - Create new offer
export const createOffer = asyncHandler(async (req, res, next) => {
  // Add creator to the offer
  req.body.createdBy = req.user.id;
  
  // Validate applicable services if provided
  if (req.body.applicableServices && req.body.applicableServices.length > 0) {
    const services = await Service.find({ 
      _id: { $in: req.body.applicableServices },
      isActive: true 
    });
    
    if (services.length !== req.body.applicableServices.length) {
      return next(new AppError('One or more specified services are invalid or inactive', 400));
    }
  }
  
  // Validate dates
  if (new Date(req.body.validUntil) <= new Date(req.body.validFrom)) {
    return next(new AppError('Valid until date must be after valid from date', 400));
  }
  
  const newOffer = await Offer.create(req.body);
  
  // Populate the created offer
  await newOffer.populate('createdBy', 'name email');
  await newOffer.populate('applicableServices', 'title price category');
  
  res.status(201).json({
    status: 'success',
    data: {
      offer: newOffer
    }
  });
});

// PATCH /api/offers/:id - Update offer
export const updateOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  
  if (!offer) {
    return next(new AppError('No offer found with that ID', 404));
  }
  
  // Check if user is authorized to update this offer
  if (req.user.role !== 'admin' && offer.createdBy.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to update this offer', 403));
  }
  
  // Validate applicable services if provided
  if (req.body.applicableServices && req.body.applicableServices.length > 0) {
    const services = await Service.find({ 
      _id: { $in: req.body.applicableServices },
      isActive: true 
    });
    
    if (services.length !== req.body.applicableServices.length) {
      return next(new AppError('One or more specified services are invalid or inactive', 400));
    }
  }
  
  // Validate dates if provided
  if (req.body.validFrom && req.body.validUntil) {
    if (new Date(req.body.validUntil) <= new Date(req.body.validFrom)) {
      return next(new AppError('Valid until date must be after valid from date', 400));
    }
  }
  
  const updatedOffer = await Offer.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate('createdBy', 'name email')
   .populate('applicableServices', 'title price category');
  
  res.status(200).json({
    status: 'success',
    data: {
      offer: updatedOffer
    }
  });
});

// DELETE /api/offers/:id - Delete offer
export const deleteOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  
  if (!offer) {
    return next(new AppError('No offer found with that ID', 404));
  }
  
  // Check if user is authorized to delete this offer
  if (req.user.role !== 'admin' && offer.createdBy.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to delete this offer', 403));
  }
  
  await Offer.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// PATCH /api/offers/:id/activate - Activate offer
export const activateOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  
  if (!offer) {
    return next(new AppError('No offer found with that ID', 404));
  }
  
  // Check if user is authorized
  if (req.user.role !== 'admin' && offer.createdBy.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to modify this offer', 403));
  }
  
  offer.isActive = true;
  await offer.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Offer activated successfully',
    data: {
      offer
    }
  });
});

// PATCH /api/offers/:id/deactivate - Deactivate offer
export const deactivateOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  
  if (!offer) {
    return next(new AppError('No offer found with that ID', 404));
  }
  
  // Check if user is authorized
  if (req.user.role !== 'admin' && offer.createdBy.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to modify this offer', 403));
  }
  
  offer.isActive = false;
  await offer.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Offer deactivated successfully',
    data: {
      offer
    }
  });
});

// POST /api/offers/:id/use - Use an offer (for booking)
export const useOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  
  if (!offer) {
    return next(new AppError('No offer found with that ID', 404));
  }
  
  // Check if offer is valid and can be used
  if (!offer.isValid) {
    return next(new AppError('This offer is not valid or has expired', 400));
  }
  
  // Check if user can use this offer
  const canUse = await Offer.canUserUseOffer(req.params.id, req.user.id);
  if (!canUse) {
    return next(new AppError('You have already used this offer or reached the usage limit', 400));
  }
  
  // Use the offer
  await offer.useOffer(req.user.id);
  
  res.status(200).json({
    status: 'success',
    message: 'Offer used successfully',
    data: {
      offer,
      discount: offer.discount,
      discountType: offer.discountType,
      maxDiscountAmount: offer.maxDiscountAmount
    }
  });
});

// GET /api/offers/validate/:code - Validate offer code
export const validateOfferCode = asyncHandler(async (req, res, next) => {
  const { code } = req.params;
  const { serviceId, orderAmount } = req.query;
  
  const offer = await Offer.findOne({ 
    offerCode: code.toUpperCase(),
    isActive: true 
  }).populate('applicableServices', 'title price category');
  
  if (!offer) {
    return next(new AppError('Invalid offer code', 404));
  }
  
  // Check if offer is valid
  if (!offer.isValid) {
    return next(new AppError('This offer has expired or is no longer valid', 400));
  }
  
  // Check minimum order amount
  if (orderAmount && offer.minOrderAmount > parseFloat(orderAmount)) {
    return next(new AppError(`Minimum order amount of ₹${offer.minOrderAmount} required`, 400));
  }
  
  // Check if applicable to specific service
  if (serviceId && offer.applicableServices.length > 0) {
    const isApplicable = offer.applicableServices.some(
      service => service._id.toString() === serviceId
    );
    if (!isApplicable) {
      return next(new AppError('This offer is not applicable to the selected service', 400));
    }
  }
  
  // Check if user can use this offer
  if (req.user) {
    const canUse = await Offer.canUserUseOffer(offer._id, req.user.id);
    if (!canUse) {
      return next(new AppError('You have already used this offer or reached the usage limit', 400));
    }
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Offer code is valid',
    data: {
      offer,
      isValid: true
    }
  });
});

// GET /api/offers/stats - Get offer statistics (Admin only)
export const getOfferStats = asyncHandler(async (req, res, next) => {
  const stats = await Offer.aggregate([
    {
      $group: {
        _id: null,
        totalOffers: { $sum: 1 },
        activeOffers: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        featuredOffers: {
          $sum: {
            $cond: [{ $eq: ['$isFeatured', true] }, 1, 0]
          }
        },
        totalUsage: { $sum: '$usageCount' },
        avgDiscount: { $avg: '$discount' },
        maxDiscount: { $max: '$discount' },
        minDiscount: { $min: '$discount' }
      }
    }
  ]);
  
  const categoryStats = await Offer.aggregate([
    { $unwind: '$applicableCategories' },
    {
      $group: {
        _id: '$applicableCategories',
        count: { $sum: 1 },
        avgDiscount: { $avg: '$discount' },
        totalUsage: { $sum: '$usageCount' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  const vehicleTypeStats = await Offer.aggregate([
    {
      $group: {
        _id: '$vehicleType',
        count: { $sum: 1 },
        avgDiscount: { $avg: '$discount' },
        totalUsage: { $sum: '$usageCount' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      general: stats[0] || {},
      byCategory: categoryStats,
      byVehicleType: vehicleTypeStats
    }
  });
});

// GET /api/offers/:id/usage-details - Top users and usage details (Admin only)
export const getOfferUsageDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid offer id', 400));
  }

  const offer = await Offer.findById(id)
    .populate('usedBy.user', 'name email phone');

  if (!offer) return next(new AppError('No offer found with that ID', 404));

  // Sort users by usageCount desc
  const topUsers = [...offer.usedBy]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 20); // limit for UI

  res.status(200).json({
    status: 'success',
    data: {
      offerId: offer._id,
      title: offer.title,
      usageCount: offer.usageCount,
      usageLimit: offer.usageLimit,
      userUsageLimit: offer.userUsageLimit,
      topUsers
    }
  });
});

// GET /api/offers/:id/stats - Get comprehensive offer statistics (Admin only)
export const getSpecificOfferStats = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid offer id', 400));
  }

  // Get offer details
  const offer = await Offer.findById(id);
  if (!offer) {
    return next(new AppError('No offer found with that ID', 404));
  }

  // Get usage history with booking details (we'll simulate this for now)
  // This would require a Booking model with offer usage tracking
  const usageHistory = [];
  
  // Get top users from the offer's usedBy array
  const topUsers = [...(offer.usedBy || [])]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10)
    .map(usage => ({
      user: {
        _id: usage.user._id,
        phone: usage.user.phone || 'N/A',
        name: usage.user.name || 'Unknown User'
      },
      usageCount: usage.usageCount || 1,
      totalSavings: (usage.usageCount || 1) * (offer.discountType === 'percentage' ? 100 : offer.discount) // Estimated savings
    }));

  // Calculate totals (estimated for now - would need booking integration)
  const totalUses = offer.usageCount || 0;
  const estimatedSavingsPerUse = offer.discountType === 'percentage' ? 100 : offer.discount;
  const totalSavings = totalUses * estimatedSavingsPerUse;
  const totalRevenue = totalSavings * 10; // Estimated revenue (10x savings)

  res.status(200).json({
    status: 'success',
    data: {
      offer: {
        _id: offer._id,
        title: offer.title,
        description: offer.description,
        discount: offer.discount,
        discountType: offer.discountType,
        validFrom: offer.validFrom,
        validUntil: offer.validUntil,
        isActive: offer.isActive,
        offerCode: offer.offerCode,
        usageLimit: offer.usageLimit,
        usageCount: offer.usageCount,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt
      },
      usageHistory,
      topUsers,
      totalRevenue,
      totalSavings
    }
  });
});

// PATCH /api/offers/:id/limits - Update usage limits (Admin only)
export const updateOfferLimits = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { usageLimit, userUsageLimit } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid offer id', 400));
  }

  const updates = {};
  if (usageLimit !== undefined) updates.usageLimit = usageLimit; // allow null for unlimited
  if (userUsageLimit !== undefined) updates.userUsageLimit = userUsageLimit;

  const updated = await Offer.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true
  });

  if (!updated) return next(new AppError('No offer found with that ID', 404));

  res.status(200).json({ status: 'success', data: updated });
});