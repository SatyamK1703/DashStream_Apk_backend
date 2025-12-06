import Booking from "../models/bookingModel.js";
import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";
import PaymentMethod from "../models/paymentMethodModel.js";
import Notification from "../models/notificationModel.js";
import { asyncHandler, AppError } from "../middleware/errorMiddleware.js";

import { sendBookingNotification } from '../services/notificationService.js';

//POST /api/bookings
export const createBooking = asyncHandler(async (req, res, next) => {
  const { service: serviceItems, ...otherBookingData } = req.body;

  if (!serviceItems || !Array.isArray(serviceItems) || serviceItems.length === 0) {
    return next(new AppError('Please provide at least one service.', 400));
  }

  const serviceIds = serviceItems.map(s => s.serviceId);
  const services = await Service.find({ '_id': { $in: serviceIds } }).select('title price duration');

  if (services.length !== new Set(serviceIds).size) {
    const foundIds = services.map(s => s._id.toString());
    const notFoundIds = [...new Set(serviceIds)].filter(id => !foundIds.includes(id));
    return next(new AppError(`Services not found: ${notFoundIds.join(', ')}`, 404));
  }

  const serviceMap = new Map(services.map(s => [s._id.toString(), s]));

  const servicesForBooking = [];
  let totalAmount = 0;
  let estimatedDuration = 0;

  for (const item of serviceItems) {
    const service = serviceMap.get(item.serviceId);
    if (!service) continue;

    const quantity = item.quantity || 1;
    servicesForBooking.push({
      serviceId: service._id,
      title: service.title,
      price: service.price,
      duration: parseInt(service.duration, 10) || 0,
      quantity,
    });

    totalAmount += service.price * quantity;
    estimatedDuration += (parseInt(service.duration, 10) || 0) * quantity;
  }

  const bookingData = {
    ...otherBookingData,
    customer: req.user.id,
    services: servicesForBooking,
    totalAmount,
    estimatedDuration,
  };

  // Create booking
  const newBooking = await Booking.create(bookingData);

  // Populate customer and services details for the response
  const populatedBooking = await Booking.findById(newBooking._id)
    .populate("customer", "name phone profileImage")
    .populate("services.serviceId", "title price duration image");

  // Send notification
  await sendBookingNotification(populatedBooking, 'created');

  const populatedBookingObject = populatedBooking.toObject();

  res.status(201).json({
    status: "success",
    booking: populatedBookingObject,
  });
});

//GET /api/bookings
export const getAllBookings = asyncHandler(async (req, res, next) => {
  const bookings = await Booking.find();

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: bookings,
  });
});

//GET /api/bookings/:id
export const getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate("customer", "name phone profileImage")
    .populate(
      "professional",
      "name phone rating profileImage experience specialization"
    )
    .populate(
      "services.serviceId",
      "title price duration image description category vehicleType"
    )
    .populate("trackingUpdates.updatedBy", "name role");

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // Check if user is authorized to view this booking
  if (
    req.user.role !== "admin" &&
    booking.customer._id.toString() !== req.user.id &&
    booking.professional &&
    booking.professional._id.toString() !== req.user.id
  ) {
    return next(
      new AppError("You are not authorized to view this booking", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: booking,
  });
});

//GET /api/bookings/my-bookings
export const getMyBookings = asyncHandler(async (req, res, next) => {
  let filter = {};

  // Filter based on user role
  if (req.user.role === "customer") {
    filter = { customer: req.user.id };
  } else if (req.user.role === "professional") {
    filter = { professional: req.user.id };
  }

  // Apply status filter if provided
  if (req.query.status) {
    // Handle multiple statuses
    if (req.query.status.includes(",")) {
      const statuses = req.query.status.split(",");
      filter.status = { $in: statuses };
    } else {
      filter.status = req.query.status;
    }
  }

  // Apply date filter if provided
  if (req.query.startDate && req.query.endDate) {
    filter.scheduledDate = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  } else if (req.query.startDate) {
    filter.scheduledDate = { $gte: new Date(req.query.startDate) };
  } else if (req.query.endDate) {
    filter.scheduledDate = { $lte: new Date(req.query.endDate) };
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get total count for pagination info
  const totalCount = await Booking.countDocuments(filter);

  const bookings = await Booking.find(filter)
    .populate("customer", "name phone profileImage")
    .populate("professional", "name phone rating profileImage")
    .populate("services.serviceId", "title price duration image")
    .sort({ scheduledDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: "success",
    results: bookings.length,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    bookings,
  });
});

//PATCH /api/bookings/:id/status
export const updateBookingStatus = asyncHandler(async (req, res, next) => {
  const { status, message } = req.body;
  const validStatuses = [
    "pending",
    "confirmed",
    "assigned",
    "in-progress",
    "completed",
    "cancelled",
    "rejected",
  ];

  if (!status || !validStatuses.includes(status)) {
    return next(new AppError("Please provide a valid status", 400));
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // Check authorization based on the status change
  if (req.user.role !== "admin") {
    // Professionals can confirm, start, or complete bookings
    if (
      ["confirmed", "assigned", "in-progress", "completed"].includes(status) &&
      booking.professional &&
      booking.professional.toString() !== req.user.id
    ) {
      return next(
        new AppError("You are not authorized to update this booking", 403)
      );
    }

    // Customers can cancel bookings
    if (
      ["cancelled"].includes(status) &&
      booking.customer.toString() !== req.user.id
    ) {
      return next(
        new AppError("You are not authorized to update this booking", 403)
      );
    }
  }

  // Update booking status
  booking.status = status;

  // Create a tracking update
  const trackingUpdate = {
    status,
    message: message || `Booking status updated to ${status}`,
    updatedBy: req.user.id,
    timestamp: Date.now(),
  };

  // Add tracking update to the booking
  booking.trackingUpdates.push(trackingUpdate);

  // Add cancellation details if applicable
  if (status === "cancelled" && req.body.cancellationReason) {
    trackingUpdate.message = req.body.cancellationReason;
  }

  // Handle rescheduling if new date/time provided
  if (req.body.rescheduleDate) {
    booking.scheduledDate = new Date(req.body.rescheduleDate);
    if (req.body.rescheduleTime) {
      booking.scheduledTime = req.body.rescheduleTime;
    }

    // Add rescheduling info to tracking update if not already set
    if (!message) {
      trackingUpdate.message = `Booking rescheduled to ${
        req.body.rescheduleDate
      } ${req.body.rescheduleTime || booking.scheduledTime}`;
    }
  }

  // Save the booking
  await booking.save();

  // Fetch the updated booking with populated fields for response
  const updatedBooking = await Booking.findById(booking._id)
    .populate("customer", "name phone profileImage")
    .populate(
      "professional",
      "name phone rating profileImage experience specialization"
    )
    .populate(
      "services.serviceId",
      "title price duration image description category vehicleType"
    )
    .populate("trackingUpdates.updatedBy", "name role");

  // Send notification
  await sendBookingNotification(updatedBooking, status);

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});

//POST /api/bookings/:id/rate
export const rateBooking = asyncHandler(async (req, res, next) => {
  const { rating: score, review } = req.body;

  if (!score || score < 1 || score > 5) {
    return next(
      new AppError("Please provide a valid rating score between 1 and 5", 400)
    );
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // Only customers who booked the service can rate it
  if (booking.customer.toString() !== req.user.id) {
    return next(
      new AppError("You are not authorized to rate this booking", 403)
    );
  }

  // Check if booking is completed
  if (booking.status !== "completed") {
    return next(new AppError("You can only rate completed bookings", 400));
  }

  // Check if already reviewed
  if (booking.rating) {
    return next(new AppError("You have already reviewed this booking", 400));
  }

  // Add rating
  booking.rating = {
    rating: score,
    review: review || "",
    createdAt: Date.now(),
  };

  await booking.save();

  // Update professional's average rating
  if (booking.professional) {
    const professional = await User.findById(booking.professional);

    if (professional) {
      // Get all completed bookings with ratings for this professional
      const completedBookings = await Booking.find({
        professional: booking.professional,
        status: "completed",
        "rating.rating": { $exists: true },
      });

      // Calculate average rating
      const totalRatings = completedBookings.length;
      const ratingSum = completedBookings.reduce(
        (sum, booking) => sum + booking.rating.rating,
        0
      );
      const averageRating =
        totalRatings > 0 ? (ratingSum / totalRatings).toFixed(1) : 0;

      // Update professional's rating
      professional.rating = parseFloat(averageRating);
      await professional.save();

      // Send notification
      await sendBookingNotification(booking, 'rated');
    }
  }

  // Fetch the updated booking with populated fields for response
  const updatedBooking = await Booking.findById(booking._id)
    .populate("customer", "name phone profileImage")
    .populate(
      "professional",
      "name phone rating profileImage experience specialization"
    )
    .populate(
      "services.serviceId",
      "title price duration image description category vehicleType"
    )
    .populate("trackingUpdates.updatedBy", "name role");

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});

//PATCH /api/bookings/:id/cancel
export const cancelBooking = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // Check authorization - customers can cancel their own bookings, professionals can cancel assigned bookings, admins can cancel any
  if (req.user.role !== "admin") {
    if (
      req.user.role === "customer" &&
      booking.customer.toString() !== req.user.id
    ) {
      return next(
        new AppError("You are not authorized to cancel this booking", 403)
      );
    }

    if (
      req.user.role === "professional" &&
      (!booking.professional || booking.professional.toString() !== req.user.id)
    ) {
      return next(
        new AppError("You are not authorized to cancel this booking", 403)
      );
    }
  }

  // Check if booking can be cancelled
  if (booking.status === "cancelled") {
    return next(new AppError("Booking is already cancelled", 400));
  }

  if (booking.status === "completed") {
    return next(new AppError("Cannot cancel a completed booking", 400));
  }

  // Update booking status to cancelled
  booking.status = "cancelled";

  // Create a tracking update for cancellation
  const trackingUpdate = {
    status: "cancelled",
    message: reason || `Booking cancelled by ${req.user.role}`,
    updatedBy: req.user.id,
    timestamp: Date.now(),
  };

  // Add tracking update to the booking
  booking.trackingUpdates.push(trackingUpdate);

  // Save cancellation reason if provided
  if (reason) {
    booking.cancellationReason = reason;
  }

  // Save the booking
  await booking.save();

  // Fetch the updated booking with populated fields for response
  const updatedBooking = await Booking.findById(booking._id)
    .populate("customer", "name phone profileImage")
    .populate(
      "professional",
      "name phone rating profileImage experience specialization"
    )
    .populate(
      "services.serviceId",
      "title price duration image description category vehicleType"
    )
    .populate("trackingUpdates.updatedBy", "name role");

  // Send notification
  await sendBookingNotification(updatedBooking, 'cancelled');

  res.status(200).json({
    status: "success",
    message: "Booking cancelled successfully",
    data: {
      booking: updatedBooking,
    },
  });
});

//GET /api/bookings/:id/tracking
export const getBookingTracking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate(
    "trackingUpdates.updatedBy",
    "name role"
  );

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // Check if user is authorized to view this booking's tracking
  if (
    req.user.role !== "admin" &&
    booking.customer.toString() !== req.user.id &&
    (!booking.professional || booking.professional.toString() !== req.user.id)
  ) {
    return next(
      new AppError("You are not authorized to view this booking's tracking", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: booking.trackingUpdates,
  });
});

//POST /api/bookings/:id/tracking
export const addTrackingUpdate = asyncHandler(async (req, res, next) => {
  const { status, message, location } = req.body;
  const validStatuses = [
    "pending",
    "confirmed",
    "assigned",
    "in-progress",
    "completed",
    "cancelled",
    "rejected",
  ];

  if (!status || !validStatuses.includes(status)) {
    return next(new AppError("Please provide a valid status update", 400));
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // Only professionals assigned to the booking or admins can add tracking updates
  if (
    req.user.role !== "admin" &&
    booking.professional &&
    booking.professional.toString() !== req.user.id
  ) {
    return next(
      new AppError("You are not authorized to update this booking", 403)
    );
  }

  // Create tracking update
  const trackingUpdate = {
    status,
    message: message || `Booking status updated to ${status}`,
    updatedBy: req.user.id,
    timestamp: Date.now(),
  };

  // Add location if provided
  if (location) {
    trackingUpdate.location = location;
  }

  // Add tracking update to the booking
  booking.trackingUpdates.push(trackingUpdate);

  // Update the booking status as well
  booking.status = status;

  // Save the booking
  await booking.save();

  // Fetch the updated booking with populated fields for response
  const updatedBooking = await Booking.findById(booking._id)
    .populate("customer", "name phone profileImage")
    .populate(
      "professional",
      "name phone rating profileImage experience specialization"
    )
    .populate(
      "services.serviceId",
      "title price duration image description category vehicleType"
    )
    .populate("trackingUpdates.updatedBy", "name role");

  // Create notification for customer
  await Notification.create({
    recipient: booking.customer,
    title: "Service Update",
    message: message || `Your service status: ${status}`,
    type: "tracking_update",
    data: { bookingId: booking._id },
  });

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});



//GET /api/bookings/stats
export const getBookingStats = asyncHandler(async (req, res, next) => {
  // Only admins and professionals can access stats
  if (req.user.role !== "admin" && req.user.role !== "professional") {
    return next(
      new AppError("You do not have permission to access this resource", 403)
    );
  }

  let matchStage = {};

  // For professionals, only show their bookings
  if (req.user.role === "professional") {
    matchStage = { professional: req.user._id };
  }

  const stats = await Booking.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  // Get monthly booking counts
  const monthlyStats = await Booking.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
    {
      $sort: { "_id.year": -1, "_id.month": -1 },
    },
    {
      $limit: 6,
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats,
      monthlyStats,
    },
  });
});
