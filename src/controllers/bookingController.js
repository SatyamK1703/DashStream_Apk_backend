import Booking from "../models/bookingModel.js";
import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";
import Notification from "../models/notificationModel.js";
import { asyncHandler, AppError } from "../middleware/errorMiddleware.js";
// PERFORMANCE OPTIMIZATION: Import query projections
import {
  bookingProjections,
  userProjections,
  serviceProjections,
  populateOptions,
} from "../utils/queryProjections.js";

//POST /api/bookings
export const createBooking = asyncHandler(async (req, res, next) => {
  // Add customer ID from authenticated user
  req.body.customer = req.user.id;

  // PERFORMANCE OPTIMIZATION: Check if service exists with minimal projection
  const service = await Service.findById(
    req.body.service,
    "title price estimatedTime isActive"
  ).lean();
  if (!service || !service.isActive) {
    return next(
      new AppError("No service found with that ID or service is inactive", 404)
    );
  }

  // PERFORMANCE OPTIMIZATION: Check professional availability with minimal projection
  if (req.body.professional) {
    const professional = await User.findById(
      req.body.professional,
      "role isAvailable status"
    ).lean();
    if (!professional || professional.role !== "professional") {
      return next(new AppError("No professional found with that ID", 404));
    }

    if (!professional.isAvailable || professional.status !== "available") {
      return next(
        new AppError("This professional is currently unavailable", 400)
      );
    }
  }

  // Set price and total amount from service if not provided
  if (!req.body.price) {
    req.body.price = service.price;
  }

  if (!req.body.totalAmount) {
    req.body.totalAmount = service.price;
  }

  // Add initial tracking update
  req.body.trackingUpdates = [
    {
      status: "pending",
      message: "Booking created and waiting for confirmation",
      updatedBy: req.user.id,
    },
  ];

  // Create booking
  const newBooking = await Booking.create(req.body);

  // PERFORMANCE OPTIMIZATION: Populate with predefined projections
  const populatedBooking = await Booking.findById(
    newBooking._id,
    bookingProjections.mobileCard
  )
    .populate(populateOptions.bookingCustomer)
    .populate(populateOptions.bookingService)
    .lean();

  // Create notification for professional if assigned
  if (req.body.professional) {
    await Notification.create({
      recipient: req.body.professional,
      title: "New Booking Request",
      message: `You have a new booking request for ${service.title}`,
      type: "booking_request",
      data: { bookingId: newBooking._id },
    });
  }

  res.status(201).json({
    status: "success",
    booking: populatedBooking,
  });
});

//GET /api/bookings
export const getAllBookings = asyncHandler(async (req, res, next) => {
  // PERFORMANCE OPTIMIZATION: Add pagination and projections
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Build filter based on query parameters
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.fromDate) {
    filter.createdAt = { $gte: new Date(req.query.fromDate) };
  }

  // Get total count for pagination
  const totalCount = await Booking.countDocuments(filter);

  // PERFORMANCE OPTIMIZATION: Use projections and lean queries
  const bookings = await Booking.find(filter, bookingProjections.adminOverview)
    .populate(populateOptions.bookingCustomer)
    .populate(populateOptions.bookingProfessional)
    .populate(populateOptions.bookingService)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    status: "success",
    results: bookings.length,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    data: {
      bookings,
    },
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
      "service",
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
    booking,
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

  // PERFORMANCE OPTIMIZATION: Use role-specific projections and lean queries
  const projection =
    req.user.role === "customer"
      ? bookingProjections.customerList
      : bookingProjections.professionalList;

  const bookings = await Booking.find(filter, projection)
    .populate(populateOptions.bookingCustomer)
    .populate(populateOptions.bookingProfessional)
    .populate(populateOptions.bookingService)
    .sort({ scheduledDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

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
      "service",
      "title price duration image description category vehicleType"
    )
    .populate("trackingUpdates.updatedBy", "name role");

  // Create notification for the other party
  const recipientId =
    req.user.role === "customer" ? booking.professional : booking.customer;

  let notificationTitle, notificationMessage, notificationType;

  switch (status) {
    case "confirmed":
      notificationTitle = "Booking Confirmed";
      notificationMessage =
        "Your booking has been confirmed by the professional";
      notificationType = "booking_confirmed";
      break;
    case "assigned":
      notificationTitle = "Professional Assigned";
      notificationMessage = "A professional has been assigned to your booking";
      notificationType = "professional_assigned";
      break;
    case "in-progress":
      notificationTitle = "Service Started";
      notificationMessage = "Your service has been started by the professional";
      notificationType = "service_started";
      break;
    case "completed":
      notificationTitle = "Service Completed";
      notificationMessage = "Your service has been marked as completed";
      notificationType = "service_completed";
      break;
    case "cancelled":
      notificationTitle = "Booking Cancelled";
      notificationMessage =
        message || `Booking has been cancelled by ${req.user.role}`;
      notificationType = "booking_cancelled";
      break;
    case "rejected":
      notificationTitle = "Booking Rejected";
      notificationMessage = message || "Your booking request has been rejected";
      notificationType = "booking_rejected";
      break;
    default:
      notificationTitle = "Booking Update";
      notificationMessage =
        message || `Your booking status has been updated to ${status}`;
      notificationType = "booking_update";
  }

  await Notification.create({
    recipient: recipientId,
    title: notificationTitle,
    message: notificationMessage,
    type: notificationType,
    data: { bookingId: booking._id },
  });

  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});

//POST /api/bookings/:id/rate
export const rateBooking = asyncHandler(async (req, res, next) => {
  const { score, review } = req.body;

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

  // Add rating
  booking.rating = {
    score,
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
        "rating.score": { $exists: true },
      });

      // Calculate average rating
      const totalRatings = completedBookings.length;
      const ratingSum = completedBookings.reduce(
        (sum, booking) => sum + booking.rating.score,
        0
      );
      const averageRating =
        totalRatings > 0 ? (ratingSum / totalRatings).toFixed(1) : 0;

      // Update professional's rating
      professional.rating = parseFloat(averageRating);
      await professional.save();

      // Create notification for professional
      await Notification.create({
        recipient: booking.professional,
        title: "New Rating Received",
        message: `You received a ${score}-star rating for your service`,
        type: "new_rating",
        data: { bookingId: booking._id },
      });
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
      "service",
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
      "service",
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

//POST /api/bookings/:id/review
export const addBookingReview = asyncHandler(async (req, res, next) => {
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(
      new AppError("Please provide a valid rating between 1 and 5", 400)
    );
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  // Only customers who booked the service can add reviews
  if (booking.customer.toString() !== req.user.id) {
    return next(new AppError("You can only review your own bookings", 403));
  }

  // Check if booking is completed
  if (booking.status !== "completed") {
    return next(new AppError("You can only review completed bookings", 400));
  }

  // Check if already reviewed
  if (booking.rating) {
    return next(new AppError("You have already reviewed this booking", 400));
  }

  // Add rating and review
  booking.rating = rating;
  booking.review = review;
  await booking.save();

  // Update professional's average rating
  const professional = await User.findById(booking.professional);
  const professionalBookings = await Booking.find({
    professional: booking.professional,
    rating: { $exists: true },
  });

  const totalRatings = professionalBookings.reduce(
    (sum, booking) => sum + booking.rating,
    0
  );
  const averageRating = totalRatings / professionalBookings.length;

  professional.rating = averageRating;
  await professional.save({ validateBeforeSave: false });

  // Create notification for professional
  await Notification.create({
    recipient: booking.professional,
    title: "New Review",
    message: `You received a ${rating}-star review for your service`,
    type: "new_review",
    data: { bookingId: booking._id },
  });

  res.status(200).json({
    status: "success",
    data: {
      booking,
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
