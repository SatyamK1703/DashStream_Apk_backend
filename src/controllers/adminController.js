import User from "../models/userModel.js";
import Booking from "../models/bookingModel.js";
import Service from "../models/serviceModel.js";
import Payment from "../models/paymentModel.js";
import { sendPushNotification } from "../services/notificationService.js";
import mongoose from "mongoose";

// Get dashboard statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can access dashboard stats.",
        403
      );
    }

    // Get counts
    const userCount = await User.countDocuments({ role: "customer" });
    const professionalCount = await User.countDocuments({
      role: "professional",
    });
    const bookingCount = await Booking.countDocuments();
    const serviceCount = await Service.countDocuments();

    // Get revenue stats - using 'captured' status as per Payment model
    const payments = await Payment.find({ status: "captured" });
    const totalRevenue = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    // Get recent bookings with error handling
    let recentBookings = [];
    try {
      recentBookings = await Booking.find()
        .sort("-createdAt")
        .limit(5)
        .populate("customer", "name")
        .populate("professional", "name")
        .populate("services.serviceId", "title");
    } catch (error) {
      console.error("Error fetching recent bookings:", error.message);
      recentBookings = [];
    }

    // Get top professionals by booking count with error handling
    let topProfessionals = [];
    let formattedTopProfessionals = [];
    try {
      topProfessionals = await Booking.aggregate([
        { $match: { professional: { $ne: null } } }, // Only bookings with assigned professionals
        {
          $group: {
            _id: "$professional",
            bookingCount: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
      ]);

      if (topProfessionals.length > 0) {
        // Populate professional details
        const populatedTopProfessionals = await User.populate(
          topProfessionals,
          {
            path: "_id",
            select: "name profileImage rating",
          }
        );

        // Format top professionals
        formattedTopProfessionals = populatedTopProfessionals
          .filter((item) => item._id) // Filter out null professionals
          .map((item) => ({
            id: item._id._id,
            name: item._id.name,
            image: item._id.profileImage?.url || "",
            rating: item._id.rating || 0,
            bookingCount: item.bookingCount,
            revenue: item.totalRevenue || 0,
          }));
      }
    } catch (error) {
      console.error("Error fetching top professionals:", error.message);
      formattedTopProfessionals = [];
    }

    // Get booking stats by day for the last 7 days with error handling
    const last7Days = [...Array(7)]
      .map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split("T")[0];
      })
      .reverse();

    let bookingsByDay = [];
    try {
      bookingsByDay = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(last7Days[0]) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } catch (error) {
      console.error("Error fetching daily booking stats:", error.message);
      bookingsByDay = [];
    }

    // Enhanced Analytics: Revenue by Service Category
    let revenueByCategory = [];
    try {
      revenueByCategory = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
          },
        },
        {
          $lookup: {
            from: "services",
            localField: "services.serviceId",
            foreignField: "_id",
            as: "serviceDetails",
          },
        },
        { $unwind: "$serviceDetails" },
        {
          $group: {
            _id: "$serviceDetails.category",
            revenue: { $sum: "$totalAmount" },
            bookings: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]);
    } catch (error) {
      console.error("Error fetching revenue by category:", error.message);
      revenueByCategory = [];
    }

    // Enhanced Analytics: Professional KPIs
    let professionalKPIs = [];
    try {
      professionalKPIs = await Booking.aggregate([
        {
          $match: {
            professional: { $ne: null },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
          },
        },
        {
          $group: {
            _id: "$professional",
            totalBookings: { $sum: 1 },
            completedBookings: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            totalRevenue: { $sum: "$totalAmount" },
            averageRating: { $avg: "$rating" },
            totalRating: { $sum: { $ifNull: ["$rating", 0] } },
            ratedBookings: {
              $sum: { $cond: [{ $ne: ["$rating", null] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "professional",
          },
        },
        { $unwind: "$professional" },
        {
          $project: {
            _id: 1,
            name: "$professional.name",
            totalBookings: 1,
            completedBookings: 1,
            totalRevenue: 1,
            completionRate: {
              $multiply: [
                { $divide: ["$completedBookings", "$totalBookings"] },
                100,
              ],
            },
            averageRating: {
              $cond: {
                if: { $gt: ["$ratedBookings", 0] },
                then: { $divide: ["$totalRating", "$ratedBookings"] },
                else: 0,
              },
            },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]);
    } catch (error) {
      console.error("Error fetching professional KPIs:", error.message);
      professionalKPIs = [];
    }

    // Enhanced Analytics: Customer Retention Rates
    let customerRetention = {};
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      // Total customers in last 30 days
      const recentCustomers = await Booking.distinct("customer", {
        createdAt: { $gte: thirtyDaysAgo },
      });

      // Customers who had bookings in both last 30 days and previous 30 days
      const retainedCustomers = await Booking.distinct("customer", {
        createdAt: { $gte: thirtyDaysAgo },
        customer: {
          $in: await Booking.distinct("customer", {
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
          }),
        },
      });

      customerRetention = {
        totalRecentCustomers: recentCustomers.length,
        retainedCustomers: retainedCustomers.length,
        retentionRate: recentCustomers.length > 0
          ? (retainedCustomers.length / recentCustomers.length) * 100
          : 0,
      };
    } catch (error) {
      console.error("Error calculating customer retention:", error.message);
      customerRetention = {
        totalRecentCustomers: 0,
        retainedCustomers: 0,
        retentionRate: 0,
      };
    }

    // Enhanced Analytics: Geographic Distribution
    let geographicDistribution = [];
    try {
      geographicDistribution = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
          },
        },
        {
          $group: {
            _id: {
              city: "$location.city",
              state: "$location.state",
            },
            bookings: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        {
          $project: {
            _id: 0,
            location: {
              $concat: [
                { $ifNull: ["$_id.city", "Unknown"] },
                ", ",
                { $ifNull: ["$_id.state", "Unknown"] },
              ],
            },
            bookings: 1,
            revenue: 1,
          },
        },
        { $sort: { bookings: -1 } },
        { $limit: 10 },
      ]);
    } catch (error) {
      console.error("Error fetching geographic distribution:", error.message);
      geographicDistribution = [];
    }

    // Format chart data
    const dailyChartData = {
      labels: last7Days.map((date) => date.split("-")[2]), // Just the day
      datasets: [
        {
          data: last7Days.map((date) => {
            const found = bookingsByDay.find((item) => item._id === date);
            return found ? found.count : 0;
          }),
        },
      ],
    };

    const dailyRevenueData = {
      labels: last7Days.map((date) => date.split("-")[2]), // Just the day
      datasets: [
        {
          data: last7Days.map((date) => {
            const found = bookingsByDay.find((item) => item._id === date);
            return found ? found.revenue : 0;
          }),
        },
      ],
    };

    // Get weekly data (last 4 weeks)
    const last4Weeks = [...Array(4)]
      .map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        return d.toISOString().split("T")[0];
      })
      .reverse();

    // Monthly data (last 6 months) with error handling
    const last6Months = [...Array(6)]
      .map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d.toISOString().split("T")[0].substring(0, 7); // YYYY-MM
      })
      .reverse();

    let bookingsByMonth = [];
    try {
      bookingsByMonth = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(last6Months[0] + "-01") },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } catch (error) {
      console.error("Error fetching monthly booking stats:", error.message);
      bookingsByMonth = [];
    }

    const monthlyChartData = {
      labels: last6Months.map((date) => {
        const [year, month] = date.split("-");
        return `${month}/${year.substring(2)}`;
      }),
      datasets: [
        {
          data: last6Months.map((date) => {
            const found = bookingsByMonth.find((item) => item._id === date);
            return found ? found.count : 0;
          }),
        },
      ],
    };

    const monthlyRevenueData = {
      labels: last6Months.map((date) => {
        const [year, month] = date.split("-");
        return `${month}/${year.substring(2)}`;
      }),
      datasets: [
        {
          data: last6Months.map((date) => {
            const found = bookingsByMonth.find((item) => item._id === date);
            return found ? found.revenue : 0;
          }),
        },
      ],
    };

    res.sendSuccess(
      {
        stats: {
          users: userCount,
          professionals: professionalCount,
          bookings: bookingCount,
          services: serviceCount,
          revenue: totalRevenue,
        },
        recentBookings: recentBookings.map((booking) => ({
          id: booking._id,
          customerName: booking.customer?.name || "Unknown Customer",
          professionalName: booking.professional?.name || "Unassigned",
          serviceName: booking.services?.[0]?.serviceId?.title || booking.services?.[0]?.title || "Unknown Service",
          date: booking.scheduledDate,
          time: booking.scheduledTime,
          status: booking.status,
          amount: booking.totalAmount || 0,
        })),
        topProfessionals: formattedTopProfessionals,
        chartData: {
          bookings: {
            daily: dailyChartData,
            weekly: monthlyChartData, // Simplified for now
            monthly: monthlyChartData,
          },
          revenue: {
            daily: dailyRevenueData,
            weekly: monthlyRevenueData, // Simplified for now
            monthly: monthlyRevenueData,
          },
        },
        // Enhanced Analytics
        analytics: {
          revenueByCategory: revenueByCategory.map((item) => ({
            category: item._id || "Uncategorized",
            revenue: item.revenue,
            bookings: item.bookings,
          })),
          professionalKPIs: professionalKPIs.map((kpi) => ({
            id: kpi._id,
            name: kpi.name,
            totalBookings: kpi.totalBookings,
            completedBookings: kpi.completedBookings,
            completionRate: Math.round(kpi.completionRate * 100) / 100,
            totalRevenue: kpi.totalRevenue,
            averageRating: Math.round(kpi.averageRating * 100) / 100,
          })),
          customerRetention,
          geographicDistribution,
        },
      },
      "Dashboard stats retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Get all users (with filtering)
export const getAllUsers = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can access user list.",
        403
      );
    }

    const { role, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const users = await User.find(query)
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.sendSuccess(
      {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
      "Users retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Get user details
export const getUserDetails = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can access user details.",
        403
      );
    }

    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.sendError("User not found", 404);
    }

    // Get user's bookings if they are a customer or professional
    let bookings = [];
    if (user.role === "customer" || user.role === "professional") {
      const bookingQuery =
        user.role === "customer"
          ? { customer: userId }
          : { professional: userId };

      bookings = await Booking.find(bookingQuery)
        .sort("-createdAt")
        .limit(5)
        .populate("services.serviceId", "title")
        .populate(
          user.role === "customer" ? "professional" : "customer",
          "name"
        );
    }

    res.sendSuccess(
      {
        user,
        bookings: bookings.map((booking) => ({
          id: booking._id,
          serviceName: booking.services?.[0]?.serviceId?.title || booking.services?.[0]?.title || "Unknown Service",
          otherPartyName:
            user.role === "customer"
              ? booking.professional?.name || "Unassigned"
              : booking.customer?.name || "Unknown",
          date: booking.scheduledDate,
          status: booking.status,
          amount: booking.totalAmount,
        })),
      },
      "User details retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Create a new user
export const createUser = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError("Unauthorized. Only admins can create users.", 403);
    }

    const { name, email, phone, role, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !role || !password) {
      return res.sendError("Please provide all required fields", 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.sendError("User with this email or phone already exists", 400);
    }

    // Create new user
    const user = new User({
      name,
      email,
      phone,
      role,
      password, // Will be hashed by the model pre-save hook
      isPhoneVerified: true, // Admin-created users are pre-verified
      profileComplete: true,
    });

    await user.save();

    res.sendSuccess(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      "User created successfully",
      201
    );
  } catch (error) {
    next(error);
  }
};

// Update user
export const updateUser = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError("Unauthorized. Only admins can update users.", 403);
    }

    const { userId } = req.params;
    const { name, email, phone, role, status } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.sendError("User not found", 404);
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    res.sendSuccess(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      "User updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError("Unauthorized. Only admins can delete users.", 403);
    }

    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.sendError("User not found", 404);
    }

    // Check if user has associated bookings
    const bookingCount = await Booking.countDocuments({
      $or: [{ customer: userId }, { professional: userId }],
    });

    if (bookingCount > 0) {
      return res.sendError(
        "Cannot delete user with associated bookings. Deactivate the account instead.",
        400
      );
    }

    await User.findByIdAndDelete(userId);

    res.sendSuccess({ id: userId }, "User deleted successfully");
  } catch (error) {
    next(error);
  }
};

// Get all bookings (with filtering)
export const getAllBookings = async (req, res, next) => {
  try {
    console.log("📋 getAllBookings called by user:", {
      id: req.user?._id,
      role: req.user?.role,
      name: req.user?.name,
    });

    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (search) {
      // Need to find bookings by customer or professional name
      // This requires a more complex approach with aggregation
      // For simplicity, we'll just search by booking ID for now
      query._id = mongoose.Types.ObjectId.isValid(search)
        ? search
        : { $exists: true }; // If invalid ID, return all
    }

    // Execute query with pagination
    const bookings = await Booking.find(query)
      .populate("customer", "name")
      .populate("professional", "name")
      .populate("services.serviceId", "title")
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Booking.countDocuments(query);

    console.log(`✅ Found ${bookings.length} bookings, total: ${total}`);

    res.sendSuccess(
      {
        bookings: bookings.map((booking) => ({
          id: booking._id,
          customerName: booking.customer?.name || "Unknown Customer",
          professionalName: booking.professional?.name || "Unassigned",
          serviceName: booking.services?.[0]?.serviceId?.title || booking.services?.[0]?.title || "Unknown Service",
          date: booking.scheduledDate,
          time: booking.scheduledTime,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          amount: booking.totalAmount,
          createdAt: booking.createdAt,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
      "Bookings retrieved successfully"
    );
  } catch (error) {
    console.error("❌ Error in getAllBookings:", error);
    next(error);
  }
};

// Get booking details
export const getBookingDetails = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can access booking details.",
        403
      );
    }

    const { bookingId } = req.params;

    console.log("📋 getBookingDetails called for booking:", bookingId);

    const booking = await Booking.findById(bookingId)
      .populate("customer", "name phone email")
      .populate("professional", "name phone email")
      .populate("services.serviceId", "title description price");

    if (!booking) {
      console.log("❌ Booking not found:", bookingId);
      return res.sendError("Booking not found", 404);
    }

    console.log("✅ Booking found:", {
      id: booking._id,
      customer: booking.customer?._id,
      professional: booking.professional?._id,
      services: booking.services?.length
    });

    // Get payment information
    const payment = await Payment.findOne({ bookingId });

    // Extract service information from services array
    const serviceInfo = booking.services?.[0] || {};
    const serviceData = serviceInfo.serviceId || {};

    res.sendSuccess(
      {
        booking: {
          id: booking._id,
          customer: {
            id: booking.customer?._id,
            name: booking.customer?.name,
            phone: booking.customer?.phone,
            email: booking.customer?.email,
          },
          professional: booking.professional
            ? {
                id: booking.professional._id,
                name: booking.professional.name,
                phone: booking.professional.phone,
                email: booking.professional.email,
              }
            : null,
          service: {
            id: serviceData._id || serviceInfo.serviceId,
            name: serviceData.title || serviceInfo.title || "Unknown Service",
            description: serviceData.description || "",
            price: serviceInfo.price || serviceData.price || 0,
          },
          vehicle: booking.vehicle || null,
          location: booking.location || null,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          paymentMethod: booking.paymentMethod,
          totalAmount: booking.totalAmount,
          notes: booking.notes,
          trackingUpdates: booking.trackingUpdates || [],
          payment: payment
            ? {
                id: payment._id,
                method: payment.paymentMethod,
                status: payment.status,
                razorpayOrderId: payment.razorpayOrderId,
                createdAt: payment.createdAt,
              }
            : null,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
        },
      },
      "Booking details retrieved successfully"
    );
  } catch (error) {
    console.error("❌ Error in getBookingDetails:", error);
    next(error);
  }
};

// Update booking
export const updateBooking = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can update bookings.",
        403
      );
    }

    const { bookingId } = req.params;
    const { status, professionalId, scheduledDate, scheduledTime, notes } =
      req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.sendError("Booking not found", 404);
    }

    // Update fields if provided
    if (status) booking.status = status;
    if (professionalId) {
      // Verify professional exists
      const professional = await User.findOne({
        _id: professionalId,
        role: "professional",
      });

      if (!professional) {
        return res.sendError("Professional not found", 404);
      }

      booking.professional = professionalId;
    }
    if (scheduledDate) booking.scheduledDate = scheduledDate;
    if (scheduledTime) booking.scheduledTime = scheduledTime;
    if (notes) booking.notes = notes;

    await booking.save();

    res.sendSuccess(
      {
        id: booking._id,
        status: booking.status,
        professionalId: booking.professional,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
      },
      "Booking updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

// ✅ Cancel Booking
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.sendError("Booking not found", 404);
    }

    if (booking.status === "cancelled") {
      return res.sendError("Booking already cancelled", 400);
    }

    booking.status = "cancelled";
    if (reason) booking.cancellationReason = reason;
    await booking.save();

    res.sendSuccess({ booking }, "Booking cancelled successfully");
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.sendError("Failed to cancel booking");
  }
};

// ✅ Update Booking Status
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.sendError("Invalid booking status", 400);
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.sendError("Booking not found", 404);
    }

    booking.status = status;
    await booking.save();

    res.sendSuccess({ booking }, "Booking status updated successfully");
  } catch (error) {
    console.error("Update booking status error:", error);
    res.sendError("Failed to update booking status");
  }
};
export const createProfessional = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can create professionals.",
        403
      );
    }

    const {
      name,
      email,
      phone,
      password,
      status,
      address,
      skills,
      serviceAreas,
      experience,
      vehicleInfo,
      profileImage,
      sendCredentials,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.sendError(
        "Please provide name, email, phone, and password",
        400
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.sendError(
        "Professional with this email or phone already exists",
        400
      );
    }

    // Create new professional
    const professional = new User({
      name,
      email,
      phone,
      password, // Will be hashed by the model pre-save hook
      role: "professional",
      status: status || "pending",
      isPhoneVerified: true, // Admin-created users are pre-verified
      profileComplete: true, // Assume profile is complete on creation
      professionalInfo: {
        skills: skills || [],
        serviceAreas: serviceAreas || [],
        experience: experience || "",
        vehicleInfo: vehicleInfo || { type: "bike" },
        availability: {
          monday: { available: false, slots: [] },
          tuesday: { available: false, slots: [] },
          wednesday: { available: false, slots: [] },
          thursday: { available: false, slots: [] },
          friday: { available: false, slots: [] },
          saturday: { available: false, slots: [] },
          sunday: { available: false, slots: [] },
        },
      },
    });

    // Add address if provided
    if (address) {
      // Create a properly formatted address object
      const formattedAddress = {
        type: address.type || 'home',
        name: address.name || `${name}'s Address`,
        address: address.address || '',
        landmark: address.landmark || '',
        city: address.city || '',
        pincode: address.pincode || '',
        country: address.country || 'IN',
        coordinates: {
          latitude: address.coordinates?.latitude || 0,
          longitude: address.coordinates?.longitude || 0
        },
        isDefault: true
      };
      
      professional.addresses = [formattedAddress];
    }

    // Handle profile image if provided
    if (profileImage) {
      // In a real implementation, you would process the image here
      // For now, we'll just store the URL if it's already a URL
      if (typeof profileImage === 'string' && profileImage.startsWith('http')) {
        professional.profileImage = { url: profileImage };
      } else if (profileImage && profileImage.url) {
        professional.profileImage = { url: profileImage.url };
      }
      // If it's a base64 string, you would process it with cloudinary or similar service
    }

    await professional.save();

    // Send credentials via email/SMS if requested
    if (sendCredentials) {
      // In a real implementation, you would send credentials via email or SMS
      console.log(`Credentials for ${name}: Email: ${email}, Password: ${password}`);
    }

    res.sendSuccess(
      {
        id: professional._id,
        name: professional.name,
        email: professional.email,
        phone: professional.phone,
        role: professional.role,
        status: professional.status,
        professionalInfo: professional.professionalInfo,
      },
      "Professional created successfully",
      201
    );
  } catch (error) {
    console.error("Create professional error:", error);
    
    // Handle specific error types
    if (error.code === 11000) {
      // Duplicate key error (usually email or phone)
      return res.sendError(
        "Professional with this email or phone already exists",
        400
      );
    }
    
    if (error.name === 'ValidationError') {
      // Mongoose validation error
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.sendError(
        `Validation error: ${errorMessages.join(', ')}`,
        400
      );
    }
    
    if (error.name === 'TypeError' && error.message.includes('coordinates')) {
      // Handle coordinates error specifically
      return res.sendError(
        "Invalid coordinates format. Please provide valid latitude and longitude values.",
        400
      );
    }
    
    // Log the full error for debugging
    console.error("Full error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    return res.sendError(
      "Failed to create professional: " + (error.message || "Unknown error"),
      500
    );
  }
};

// Get all professionals (with filtering)
export const getAllProfessionals = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can access professional list.",
        403
      );
    }

    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query for professionals only
    const query = { role: "professional" };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const professionals = await User.find(query)

      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Get booking counts for each professional
    const professionalIds = professionals.map((p) => p._id);
    const bookingCounts = await Booking.aggregate([
      { $match: { professional: { $in: professionalIds } } },
      { $group: { _id: "$professional", count: { $sum: 1 } } },
    ]);

    // Create a map for quick lookup
    const bookingCountMap = {};
    bookingCounts.forEach((item) => {
      bookingCountMap[item._id.toString()] = item.count;
    });

    res.sendSuccess(
      {
        professionals: professionals.map((prof) => ({
          id: prof._id,
          name: prof.name,
          email: prof.email,
          phone: prof.phone,
          profileImage: prof.profileImage,
          status: prof.status,
          isPhoneVerified: prof.isPhoneVerified,
          totalBookings: bookingCountMap[prof._id.toString()] || 0,
          specializations: prof.professionalInfo?.specializations || [],
          rating: prof.professionalInfo?.rating || 0,
          createdAt: prof.createdAt,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
      "Professionals retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Get professional details
export const getProfessionalDetails = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can access professional details.",
        403
      );
    }

    const { professionalId } = req.params;

    const professional = await User.findOne({
      _id: professionalId,
      role: "professional",
    });

    if (!professional) {
      return res.sendError("Professional not found", 404);
    }

    // Get professional's bookings
    const bookings = await Booking.find({ professional: professionalId })
      .sort("-createdAt")
      .limit(10)
      .populate("customer", "name")
      .populate("services.serviceId", "title");

    // Get professional's ratings and reviews
    const reviews = await Booking.find({
      professional: professionalId,
      rating: { $exists: true },
    })
      .populate("customer", "name")
      .sort("-createdAt")
      .limit(5);

    res.sendSuccess(
      {
        professional,
        bookings: bookings.map((booking) => ({
          id: booking._id,
          customerName: booking.customer?.name || "Unknown",
          serviceName: booking.services?.[0]?.serviceId?.title || booking.services?.[0]?.title || "Unknown Service",
          date: booking.scheduledDate,
          status: booking.status,
          amount: booking.totalAmount,
        })),
        reviews: reviews.map((review) => ({
          id: review._id,
          customerName: review.customer.name,
          rating: review.rating,
          review: review.review,
          date: review.createdAt,
        })),
      },
      "Professional details retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// ✅ Get professional by ID
export const getProfessionalById = async (req, res) => {
  try {
    // Fix: Use professionalId instead of id to match the route parameter
    const { professionalId } = req.params;
    
    console.log("Fetching professional with ID:", professionalId);

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(professionalId)) {
      console.log("Invalid ID format:", professionalId);
      return res.sendError("Invalid professional ID format", 400);
    }

    // First try to find by _id
    let professional = await User.findOne({
      _id: professionalId,
      role: "professional",
    }).select("-otp -otpExpires");
    
    // If not found, try to find by id field (in case it's stored differently)
    if (!professional) {
      console.log("Professional not found by _id, trying id field");
      professional = await User.findOne({
        id: professionalId,
        role: "professional",
      }).select("-otp -otpExpires");
    }

    if (!professional) {
      console.log("Professional not found with ID:", professionalId);
      return res.sendError("Professional not found", 404);
    }

    console.log("Professional found:", professional.name);
    
    // Return the professional directly instead of nested in an object
    // This matches the format expected by the frontend
    res.sendSuccess(professional, "Professional fetched successfully");
  } catch (error) {
    console.error("Get professional error:", error);
    res.sendError("Failed to fetch professional");
  }
};

// Update professional
export const updateProfessional = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can update professionals.",
        403
      );
    }

    const { professionalId } = req.params;
    const { name, email, phone, status, specializations, hourlyRate } =
      req.body;

    const professional = await User.findOne({
      _id: professionalId,
      role: "professional",
    });

    if (!professional) {
      return res.sendError("Professional not found", 404);
    }

    // Update basic fields if provided
    if (name) professional.name = name;
    if (email) professional.email = email;
    if (phone) professional.phone = phone;
    if (status) professional.status = status;

    // Update professional info
    if (specializations || hourlyRate) {
      if (!professional.professionalInfo) {
        professional.professionalInfo = {};
      }
      if (specializations)
        professional.professionalInfo.specializations = specializations;
      if (hourlyRate) professional.professionalInfo.hourlyRate = hourlyRate;
    }

    await professional.save();

    res.sendSuccess(
      {
        id: professional._id,
        name: professional.name,
        email: professional.email,
        phone: professional.phone,
        status: professional.status,
        professionalInfo: professional.professionalInfo,
      },
      "Professional updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Update professional verification status
export const updateProfessionalVerification = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== "admin") {
      return res.sendError(
        "Unauthorized. Only admins can update verification status.",
        403
      );
    }

    const { professionalId } = req.params;
    const { isVerified, verificationNotes } = req.body;

    const professional = await User.findOne({
      _id: professionalId,
      role: "professional",
    });

    if (!professional) {
      return res.sendError("Professional not found", 404);
    }

    // Initialize professionalInfo if it doesn't exist
    if (!professional.professionalInfo) {
      professional.professionalInfo = {};
    }

    // Update verification status
    professional.professionalInfo.isVerified = isVerified;
    if (verificationNotes) {
      professional.professionalInfo.verificationNotes = verificationNotes;
    }
    professional.professionalInfo.verificationDate = new Date();

    await professional.save();

    res.sendSuccess(
      {
        id: professional._id,
        name: professional.name,
        isVerified: professional.professionalInfo.isVerified,
        verificationNotes: professional.professionalInfo.verificationNotes,
        verificationDate: professional.professionalInfo.verificationDate,
      },
      `Professional ${isVerified ? "verified" : "unverified"} successfully`
    );
  } catch (error) {
    next(error);
  }
};

// ✅ Verify / Reject Professional
export const verifyProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body; // true = verify, false = reject

    const professional = await User.findOne({ _id: id, role: "professional" });
    if (!professional) {
      return res.sendError("Professional not found", 404);
    }

    professional.profileComplete = verified; // using profileComplete as "verified" flag
    await professional.save();

    res.sendSuccess(
      { professional },
      verified ? "Professional verified successfully" : "Professional rejected"
    );
  } catch (error) {
    console.error("Verify professional error:", error);
    res.sendError("Failed to update professional verification");
  }
};

// ✅ Get Available Professionals for Booking
export const getAvailableProfessionals = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.sendError("Invalid booking ID format", 400);
    }
    
    // Verify booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.sendError("Booking not found", 404);
    }
    
    // Get service details from the booking's services array
    let serviceCategories = [];
    if (booking.services && booking.services.length > 0) {
      // Extract service IDs from booking
      const serviceIds = booking.services.map(s => s.serviceId);
      
      // Find all services in the booking
      const services = await Service.find({ _id: { $in: serviceIds } });
      
      // Extract categories
      serviceCategories = services
        .map(s => s.category)
        .filter(Boolean); // Remove any undefined/null values
    }
    
    console.log(`Finding professionals for booking ${bookingId} with service categories:`, serviceCategories);
    
    // Find professionals
    // Base query - get all professionals regardless of specialization
    const query = { 
      role: "professional",
    };
    
    // Get all professionals - we'll sort them by relevance later
    const professionals = await User.find(query)
      .select('_id name email phone profileImage professionalInfo status')
      .sort('name');
    
    console.log(`Found ${professionals.length} professionals total`);
    
    // Filter and sort professionals by relevance
    const sortedProfessionals = professionals
      // Filter out inactive professionals
      .filter(prof => prof.status !== 'inactive')
      // Map to include relevance score
      .map(prof => {
        // Calculate relevance score
        let relevanceScore = 0;
        
        // Higher score for verified/complete profile
        if (prof.profileComplete) relevanceScore += 10;
        
        // Higher score for matching specializations
        const specializations = prof.professionalInfo?.specializations || [];
        const matchingSpecs = specializations.filter(spec => 
          serviceCategories.includes(spec)
        );
        
        relevanceScore += matchingSpecs.length * 5;
        
        // Higher score for higher ratings
        const rating = prof.professionalInfo?.rating || 0;
        relevanceScore += rating;
        
        return {
          id: prof._id,
          name: prof.name,
          email: prof.email,
          phone: prof.phone,
          profileImage: prof.profileImage?.url,
          rating: rating,
          specializations: specializations,
          status: prof.status,
          verified: !!prof.profileComplete,
          relevanceScore
        };
      })
      // Sort by relevance score (highest first)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    res.sendSuccess(
      { 
        professionals: sortedProfessionals,
        booking: {
          id: booking._id,
          services: booking.services,
          status: booking.status,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          location: booking.location
        }
      },
      "Available professionals retrieved successfully"
    );
  } catch (error) {
    console.error("Get available professionals error:", error);
    res.sendError(`Failed to get available professionals: ${error.message}`);
  }
};

// ✅ Assign Professional to Booking
export const assignProfessional = async (req, res) => {
  try {
    const { bookingId } = req.params; // bookingId
    const { professionalId } = req.body;

    if (!professionalId) {
      return res.sendError("Professional ID is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.sendError("Invalid booking ID format", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(professionalId)) {
      return res.sendError("Invalid professional ID format", 400);
    }

    // Log the IDs for debugging
    console.log(`Assigning professional ${professionalId} to booking ${bookingId}`);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.sendError("Booking not found", 404);
    }

    const professional = await User.findOne({
      _id: professionalId,
      role: "professional",
    });
    if (!professional) {
      return res.sendError("Professional not found", 404);
    }

    // Update booking with professional
    booking.professional = professional._id;
    booking.status = "confirmed"; // auto-confirm when assigned
    
    // Add tracking update
    booking.trackingUpdates.push({
      status: "confirmed",
      message: `Professional ${professional.name} assigned to booking`,
      updatedBy: req.user._id,
      timestamp: new Date()
    });

    await booking.save();

    // --- Send Notifications ---
    // To Customer
    const customerId = booking.customer;
    const customerNotificationData = {
      title: 'Service Confirmed',
      message: `Service confirmed and Professional Assigned: ${professional.name}`,
      type: 'booking',
      actionType: 'open_booking',
      actionParams: { bookingId: booking._id.toString() },
    };
    await sendPushNotification(customerNotificationData, customerId);

    // To Professional
    const professionalNotificationData = {
      title: 'New Service Assigned',
      message: 'You have a new order/service.',
      type: 'booking',
      actionType: 'open_booking',
      actionParams: { bookingId: booking._id.toString() },
    };
    await sendPushNotification(professionalNotificationData, professional._id);
    // --- End of Notifications ---

    // Fetch the updated booking with populated fields
    const updatedBooking = await Booking.findById(booking._id)
      .populate("customer", "name phone profileImage")
      .populate("professional", "name phone profileImage")
      .populate("services.serviceId", "title price duration");

    res.sendSuccess(
      { booking: updatedBooking },
      "Professional assigned to booking successfully"
    );
  } catch (error) {
    console.error("Assign professional error:", error);
    res.sendError(`Failed to assign professional to booking: ${error.message}`);
  }
};

// ✅ Get all services
export const getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    const services = await Service.find(query)
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Service.countDocuments(query);

    res.sendSuccess(
      {
        services,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit),
        },
      },
      "Services fetched successfully"
    );
  } catch (error) {
    console.error("Get services error:", error);
    res.sendError("Failed to fetch services");
  }
};

// ✅ Get service by ID
export const getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = await Service.findById(serviceId);

    if (!service) return res.sendError("Service not found", 404);

    res.sendSuccess({ service }, "Service fetched successfully");
  } catch (error) {
    console.error("Get service error:", error);
    res.sendError("Failed to fetch service");
  }
};

// ✅ Create service
export const createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);

    res.sendSuccess({ service }, "Service created successfully", 201);
  } catch (error) {
    console.error("Create service error:", error);
    res.sendError("Failed to create service");
  }
};

// ✅ Update service
export const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findByIdAndUpdate(serviceId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!service) return res.sendError("Service not found", 404);

    res.sendSuccess({ service }, "Service updated successfully");
  } catch (error) {
    console.error("Update service error:", error);
    res.sendError("Failed to update service");
  }
};

// ✅ Delete service
export const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findByIdAndDelete(serviceId);
    if (!service) return res.sendError("Service not found", 404);

    res.sendSuccess(null, "Service deleted successfully");
  } catch (error) {
    console.error("Delete service error:", error);
    res.sendError("Failed to delete service");
  }
};

// ✅ Bulk Operations

// Bulk update user status
export const bulkUpdateUserStatus = async (req, res) => {
  try {
    const { userIds, status } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.sendError("User IDs array is required", 400);
    }

    if (!status || !['active', 'inactive', 'blocked'].includes(status)) {
      return res.sendError("Valid status is required (active, inactive, blocked)", 400);
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { status }
    );

    res.sendSuccess({
      updated: result.modifiedCount,
      total: userIds.length
    }, `Successfully updated ${result.modifiedCount} users`);
  } catch (error) {
    console.error("Bulk update user status error:", error);
    res.sendError("Failed to bulk update user status");
  }
};

// Bulk assign professional to bookings
export const bulkAssignProfessional = async (req, res) => {
  try {
    const { bookingIds, professionalId } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.sendError("Booking IDs array is required", 400);
    }

    if (!professionalId) {
      return res.sendError("Professional ID is required", 400);
    }

    // Verify professional exists
    const professional = await User.findOne({
      _id: professionalId,
      role: "professional"
    });

    if (!professional) {
      return res.sendError("Professional not found", 404);
    }

    const result = await Booking.updateMany(
      { _id: { $in: bookingIds }, status: { $in: ['pending', 'confirmed'] } },
      {
        professional: professionalId,
        status: 'confirmed'
      }
    );

    res.sendSuccess({
      updated: result.modifiedCount,
      total: bookingIds.length
    }, `Successfully assigned professional to ${result.modifiedCount} bookings`);
  } catch (error) {
    console.error("Bulk assign professional error:", error);
    res.sendError("Failed to bulk assign professional");
  }
};

// Bulk update service prices
export const bulkUpdateServicePrices = async (req, res) => {
  try {
    const { serviceUpdates } = req.body;

    if (!serviceUpdates || !Array.isArray(serviceUpdates) || serviceUpdates.length === 0) {
      return res.sendError("Service updates array is required", 400);
    }

    let updatedCount = 0;
    const results = [];

    for (const update of serviceUpdates) {
      const { serviceId, price, discountPrice } = update;

      if (!serviceId) continue;

      const updateData = {};
      if (price !== undefined) updateData.price = price;
      if (discountPrice !== undefined) updateData.discountPrice = discountPrice;

      const result = await Service.findByIdAndUpdate(serviceId, updateData, { new: true });
      if (result) {
        updatedCount++;
        results.push({
          serviceId,
          title: result.title,
          newPrice: result.price,
          newDiscountPrice: result.discountPrice
        });
      }
    }

    res.sendSuccess({
      updated: updatedCount,
      total: serviceUpdates.length,
      results
    }, `Successfully updated ${updatedCount} services`);
  } catch (error) {
    console.error("Bulk update service prices error:", error);
    res.sendError("Failed to bulk update service prices");
  }
};

// Bulk verify professionals
export const bulkVerifyProfessionals = async (req, res) => {
  try {
    const { professionalIds, isVerified, verificationNotes } = req.body;

    if (!professionalIds || !Array.isArray(professionalIds) || professionalIds.length === 0) {
      return res.sendError("Professional IDs array is required", 400);
    }

    if (typeof isVerified !== 'boolean') {
      return res.sendError("isVerified boolean is required", 400);
    }

    const updateData = {
      'professionalInfo.isVerified': isVerified,
      'professionalInfo.verificationDate': new Date()
    };

    if (verificationNotes) {
      updateData['professionalInfo.verificationNotes'] = verificationNotes;
    }

    const result = await User.updateMany(
      {
        _id: { $in: professionalIds },
        role: "professional"
      },
      updateData
    );

    res.sendSuccess({
      updated: result.modifiedCount,
      total: professionalIds.length
    }, `Successfully ${isVerified ? 'verified' : 'unverified'} ${result.modifiedCount} professionals`);
  } catch (error) {
    console.error("Bulk verify professionals error:", error);
    res.sendError("Failed to bulk verify professionals");
  }
};
