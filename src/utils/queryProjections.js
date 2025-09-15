/**
 * Query Projections for Performance Optimization
 * These projections reduce data transfer and improve query performance
 * by selecting only the necessary fields for specific operations
 */

// User Projections
export const userProjections = {
  // Basic user info for listings and references
  basic: "name phone profileImage.url role",

  // Customer profile for bookings
  customer: "name phone email profileImage.url addresses lastActive",

  // Professional info for booking assignments
  professional:
    "name phone email profileImage.url rating totalRatings isAvailable status reviews experience specialization",

  // Minimal user info for notifications
  notification: "name phone fcmToken",

  // Authentication info
  auth: "phone email role isPhoneVerified profileComplete otp otpExpires",

  // Admin dashboard user list
  adminList:
    "name phone email role isPhoneVerified profileComplete createdAt lastActive",

  // Location tracking
  tracking: "name phone trackingEnabled trackingSettings locationSubscribers",

  // Public profile (no sensitive data)
  public: "name profileImage.url rating totalRatings reviews role",
};

// Booking Projections
export const bookingProjections = {
  // Customer booking list
  customerList:
    "service professional status scheduledDate scheduledTime totalAmount paymentStatus createdAt location.address.address",

  // Professional booking list
  professionalList:
    "customer service status scheduledDate scheduledTime totalAmount location.address estimatedDuration createdAt",

  // Admin booking overview
  adminOverview:
    "customer professional service status scheduledDate totalAmount paymentStatus createdAt location.address.city",

  // Booking card for mobile app
  mobileCard:
    "service professional status scheduledDate scheduledTime price totalAmount paymentStatus location.address",

  // Full booking details
  full: "-trackingUpdates.updatedBy -__v",

  // Analytics/reporting
  analytics:
    "customer professional service status totalAmount paymentMethod scheduledDate createdAt actualStartTime actualEndTime",

  // Location-based queries
  location:
    "customer service status scheduledDate location.coordinates location.address totalAmount",
};

// Service Projections
export const serviceProjections = {
  // Service listing for mobile app
  listing:
    "title description price discountPrice duration image category vehicleType rating isPopular",

  // Service details page
  details:
    "title description longDescription price discountPrice duration image banner category vehicleType rating numReviews tags features",

  // Admin service management
  admin:
    "title description price discountPrice category vehicleType isActive rating numReviews createdAt",

  // Basic service info for bookings
  booking: "title price duration image category vehicleType estimatedTime",

  // Search results
  search:
    "title description price duration image category vehicleType rating tags",

  // Analytics
  analytics: "title category price vehicleType rating numReviews createdAt",
};

// Payment Projections
export const paymentProjections = {
  // User payment history
  userHistory: "bookingId amount currency status paymentMethod createdAt",

  // Admin financial dashboard
  adminFinancial:
    "userId bookingId amount currency status paymentMethod createdAt refundAmount",

  // Payment verification
  verification:
    "razorpayOrderId razorpayPaymentId razorpaySignature status amount",

  // Analytics
  analytics: "amount currency status paymentMethod createdAt refundAmount",

  // Basic payment info
  basic: "amount status paymentMethod createdAt",
};

// Notification Projections
export const notificationProjections = {
  // User notification list
  userList: "title message type read createdAt data",

  // Admin notifications
  admin: "recipient title message type read createdAt",

  // Mobile app notifications
  mobile: "title message type read createdAt data.bookingId data.serviceId",
};

// Common Population Options with Projections
export const populateOptions = {
  // Booking populations
  bookingCustomer: {
    path: "customer",
    select: userProjections.customer,
  },

  bookingProfessional: {
    path: "professional",
    select: userProjections.professional,
  },

  bookingService: {
    path: "service",
    select: serviceProjections.booking,
  },

  // User populations
  userVehicle: {
    path: "vehicle",
    select: "type brand model",
  },

  // Payment populations
  paymentBooking: {
    path: "bookingId",
    select: bookingProjections.mobileCard,
    populate: [
      { path: "service", select: serviceProjections.basic },
      { path: "professional", select: userProjections.basic },
    ],
  },

  paymentUser: {
    path: "userId",
    select: userProjections.basic,
  },
};

// Helper function to get projection by model and type
export const getProjection = (model, type = "basic") => {
  const projections = {
    user: userProjections,
    booking: bookingProjections,
    service: serviceProjections,
    payment: paymentProjections,
    notification: notificationProjections,
  };

  return projections[model]?.[type] || null;
};

// Helper function to create lean queries with projections
export const createLeanQuery = (
  Model,
  filter = {},
  projection = null,
  options = {}
) => {
  return Model.find(filter, projection, options).lean();
};

// Performance helper: Create paginated query with projections
export const createPaginatedQuery = (
  Model,
  filter = {},
  projection = null,
  page = 1,
  limit = 10,
  sort = {}
) => {
  const skip = (page - 1) * limit;

  return {
    query: Model.find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    countQuery: Model.countDocuments(filter),
  };
};

export default {
  userProjections,
  bookingProjections,
  serviceProjections,
  paymentProjections,
  notificationProjections,
  populateOptions,
  getProjection,
  createLeanQuery,
  createPaginatedQuery,
};
