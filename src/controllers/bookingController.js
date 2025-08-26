
import Booking from '../models/bookingModel.js';
import User from '../models/userModel.js';
import Service from '../models/serviceModel.js';
import Notification from '../models/notificationModel.js';
import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';

/**
 * Create a new booking
 * @route POST /api/bookings
 */ 
export const createBooking = asyncHandler(async (req, res, next) => {
  // Add customer ID from authenticated user
  req.body.customer = req.user.id;

  // Check if professional exists and is available
  const professional = await User.findById(req.body.professional);
  if (!professional || professional.role !== 'professional') {
    return next(new AppError('No professional found with that ID', 404));
  }

  if (!professional.isAvailable) {
    return next(new AppError('This professional is currently unavailable', 400));
  }

  // Check if service exists
  const service = await Service.findById(req.body.service);
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  // Create booking
  const newBooking = await Booking.create(req.body);

  // Create notification for professional
  await Notification.create({
    recipient: req.body.professional,
    title: 'New Booking Request',
    message: `You have a new booking request for ${service.name}`,
    type: 'booking_request',
    data: { bookingId: newBooking._id }
  });

  res.status(201).json({
    status: 'success',
    data: {
      booking: newBooking
    }
  });
});

/**
 * Get all bookings (admin only)
 * @route GET /api/bookings
 */
export const getAllBookings = asyncHandler(async (req, res, next) => {
  const bookings = await Booking.find();

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings
    }
  });
});

/**
 * Get booking by ID
 * @route GET /api/bookings/:id
 */
export const getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('customer', 'name phone')
    .populate('professional', 'name phone rating')
    .populate('service', 'name price duration');

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  // Check if user is authorized to view this booking
  if (
    req.user.role !== 'admin' &&
    booking.customer._id.toString() !== req.user.id &&
    booking.professional._id.toString() !== req.user.id
  ) {
    return next(new AppError('You are not authorized to view this booking', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

/**
 * Get current user's bookings
 * @route GET /api/bookings/my-bookings
 */
export const getMyBookings = asyncHandler(async (req, res, next) => {
  let filter = {};

  // Filter based on user role
  if (req.user.role === 'customer') {
    filter = { customer: req.user.id };
  } else if (req.user.role === 'professional') {
    filter = { professional: req.user.id };
  }

  // Apply status filter if provided
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const bookings = await Booking.find(filter)
    .populate('customer', 'name phone')
    .populate('professional', 'name phone rating')
    .populate('service', 'name price duration')
    .sort({ scheduledDate: -1 });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings
    }
  });
});

/**
 * Update booking status
 * @route PATCH /api/bookings/:id/status
 */
export const updateBookingStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = [
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'rescheduled'
  ];

  if (!status || !validStatuses.includes(status)) {
    return next(new AppError('Please provide a valid status', 400));
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  // Check authorization based on the status change
  if (req.user.role !== 'admin') {
    // Professionals can confirm, start, or complete bookings
    if (
      ['confirmed', 'in_progress', 'completed'].includes(status) &&
      booking.professional.toString() !== req.user.id
    ) {
      return next(new AppError('You are not authorized to update this booking', 403));
    }

    // Customers can cancel or request reschedule
    if (
      ['cancelled', 'rescheduled'].includes(status) &&
      booking.customer.toString() !== req.user.id
    ) {
      return next(new AppError('You are not authorized to update this booking', 403));
    }
  }

  // Update booking status
  booking.status = status;
  
  // Add cancellation details if applicable
  if (status === 'cancelled' && req.body.cancellationReason) {
    booking.cancellation = {
      reason: req.body.cancellationReason,
      cancelledBy: req.user.role,
      cancelledAt: Date.now()
    };
  }
  
  // Add rescheduling details if applicable
  if (status === 'rescheduled' && req.body.rescheduleDate) {
    booking.rescheduling = {
      oldDate: booking.scheduledDate,
      oldTime: booking.scheduledTime,
      requestedBy: req.user.role,
      requestedAt: Date.now()
    };
    
    booking.scheduledDate = req.body.rescheduleDate;
    booking.scheduledTime = req.body.rescheduleTime || booking.scheduledTime;
  }

  await booking.save();

  // Create notification for the other party
  const recipientId = req.user.role === 'customer' 
    ? booking.professional 
    : booking.customer;

  let notificationTitle, notificationMessage, notificationType;

  switch (status) {
    case 'confirmed':
      notificationTitle = 'Booking Confirmed';
      notificationMessage = 'Your booking has been confirmed by the professional';
      notificationType = 'booking_confirmed';
      break;
    case 'in_progress':
      notificationTitle = 'Service Started';
      notificationMessage = 'Your service has been started by the professional';
      notificationType = 'service_started';
      break;
    case 'completed':
      notificationTitle = 'Service Completed';
      notificationMessage = 'Your service has been marked as completed';
      notificationType = 'service_completed';
      break;
    case 'cancelled':
      notificationTitle = 'Booking Cancelled';
      notificationMessage = `Booking has been cancelled by ${req.user.role}`;
      notificationType = 'booking_cancelled';
      break;
    case 'rescheduled':
      notificationTitle = 'Booking Rescheduled';
      notificationMessage = `Booking has been rescheduled by ${req.user.role}`;
      notificationType = 'booking_rescheduled';
      break;
    default:
      notificationTitle = 'Booking Update';
      notificationMessage = `Your booking status has been updated to ${status}`;
      notificationType = 'booking_update';
  }

  await Notification.create({
    recipient: recipientId,
    title: notificationTitle,
    message: notificationMessage,
    type: notificationType,
    data: { bookingId: booking._id }
  });

  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

/**
 * Add tracking update to booking
 * @route POST /api/bookings/:id/tracking
 */
export const addTrackingUpdate = asyncHandler(async (req, res, next) => {
  const { status, location, notes } = req.body;

  if (!status) {
    return next(new AppError('Please provide a status update', 400));
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  // Only professionals assigned to the booking can add tracking updates
  if (
    req.user.role !== 'admin' &&
    booking.professional.toString() !== req.user.id
  ) {
    return next(new AppError('You are not authorized to update this booking', 403));
  }

  // Add tracking update
  booking.tracking.push({
    status,
    location,
    notes,
    timestamp: Date.now(),
    updatedBy: req.user.id
  });

  await booking.save();

  // Create notification for customer
  await Notification.create({
    recipient: booking.customer,
    title: 'Service Update',
    message: `Your service status: ${status}`,
    type: 'tracking_update',
    data: { bookingId: booking._id }
  });

  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

/**
 * Add rating and review to booking
 * @route POST /api/bookings/:id/review
 */
export const addBookingReview = asyncHandler(async (req, res, next) => {
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Please provide a valid rating between 1 and 5', 400));
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('No booking found with that ID', 404));
  }

  // Only customers who booked the service can add reviews
  if (booking.customer.toString() !== req.user.id) {
    return next(new AppError('You can only review your own bookings', 403));
  }

  // Check if booking is completed
  if (booking.status !== 'completed') {
    return next(new AppError('You can only review completed bookings', 400));
  }

  // Check if already reviewed
  if (booking.rating) {
    return next(new AppError('You have already reviewed this booking', 400));
  }

  // Add rating and review
  booking.rating = rating;
  booking.review = review;
  await booking.save();

  // Update professional's average rating
  const professional = await User.findById(booking.professional);
  const professionalBookings = await Booking.find({
    professional: booking.professional,
    rating: { $exists: true }
  });

  const totalRatings = professionalBookings.reduce((sum, booking) => sum + booking.rating, 0);
  const averageRating = totalRatings / professionalBookings.length;

  professional.rating = averageRating;
  await professional.save({ validateBeforeSave: false });

  // Create notification for professional
  await Notification.create({
    recipient: booking.professional,
    title: 'New Review',
    message: `You received a ${rating}-star review for your service`,
    type: 'new_review',
    data: { bookingId: booking._id }
  });

  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

/**
 * Get booking statistics
 * @route GET /api/bookings/stats
 */
export const getBookingStats = asyncHandler(async (req, res, next) => {
  // Only admins and professionals can access stats
  if (req.user.role !== 'admin' && req.user.role !== 'professional') {
    return next(new AppError('You do not have permission to access this resource', 403));
  }

  let matchStage = {};
  
  // For professionals, only show their bookings
  if (req.user.role === 'professional') {
    matchStage = { professional: req.user._id };
  }

  const stats = await Booking.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);

  // Get monthly booking counts
  const monthlyStats = await Booking.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: { 
          month: { $month: '$createdAt' }, 
          year: { $year: '$createdAt' } 
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 6
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
      monthlyStats
    }
  });
});

