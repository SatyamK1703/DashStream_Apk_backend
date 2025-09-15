import User from '../models/userModel.js';
import Booking from '../models/bookingModel.js';
import Service from '../models/serviceModel.js';
import Payment from '../models/paymentModel.js';
import mongoose from 'mongoose';

// Get dashboard statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access dashboard stats.', 403);
    }
    
    // Get counts
    const userCount = await User.countDocuments({ role: 'customer' });
    const professionalCount = await User.countDocuments({ role: 'professional' });
    const bookingCount = await Booking.countDocuments();
    const serviceCount = await Service.countDocuments();
    
    // Get revenue stats - using 'captured' status as per Payment model
    const payments = await Payment.find({ status: 'captured' });
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Get recent bookings with error handling
    let recentBookings = [];
    try {
      recentBookings = await Booking.find()
        .sort('-createdAt')
        .limit(5)
        .populate('customer', 'name')
        .populate('professional', 'name')
        .populate('service', 'name');
    } catch (error) {
      console.error('Error fetching recent bookings:', error.message);
      recentBookings = [];
    }
    
    // Get top professionals by booking count with error handling
    let topProfessionals = [];
    let formattedTopProfessionals = [];
    try {
      topProfessionals = await Booking.aggregate([
        { $match: { professional: { $ne: null } } }, // Only bookings with assigned professionals
        { $group: {
          _id: '$professional',
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }},
        { $sort: { bookingCount: -1 } },
        { $limit: 5 }
      ]);
      
      if (topProfessionals.length > 0) {
        // Populate professional details
        const populatedTopProfessionals = await User.populate(topProfessionals, {
          path: '_id',
          select: 'name profileImage rating'
        });
        
        // Format top professionals
        formattedTopProfessionals = populatedTopProfessionals
          .filter(item => item._id) // Filter out null professionals
          .map(item => ({
            id: item._id._id,
            name: item._id.name,
            image: item._id.profileImage?.url || '',
            rating: item._id.rating || 0,
            bookingCount: item.bookingCount,
            revenue: item.totalRevenue || 0
          }));
      }
    } catch (error) {
      console.error('Error fetching top professionals:', error.message);
      formattedTopProfessionals = [];
    }
    
    // Get booking stats by day for the last 7 days with error handling
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    
    let bookingsByDay = [];
    try {
      bookingsByDay = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(last7Days[0]) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    } catch (error) {
      console.error('Error fetching daily booking stats:', error.message);
      bookingsByDay = [];
    }
    
    // Format chart data
    const dailyChartData = {
      labels: last7Days.map(date => date.split('-')[2]), // Just the day
      datasets: [
        {
          data: last7Days.map(date => {
            const found = bookingsByDay.find(item => item._id === date);
            return found ? found.count : 0;
          })
        }
      ]
    };
    
    const dailyRevenueData = {
      labels: last7Days.map(date => date.split('-')[2]), // Just the day
      datasets: [
        {
          data: last7Days.map(date => {
            const found = bookingsByDay.find(item => item._id === date);
            return found ? found.revenue : 0;
          })
        }
      ]
    };
    
    // Get weekly data (last 4 weeks)
    const last4Weeks = [...Array(4)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      return d.toISOString().split('T')[0];
    }).reverse();
    
    // Monthly data (last 6 months) with error handling
    const last6Months = [...Array(6)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
    }).reverse();
    
    let bookingsByMonth = [];
    try {
      bookingsByMonth = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(last6Months[0] + '-01') }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    } catch (error) {
      console.error('Error fetching monthly booking stats:', error.message);
      bookingsByMonth = [];
    }
    
    const monthlyChartData = {
      labels: last6Months.map(date => {
        const [year, month] = date.split('-');
        return `${month}/${year.substring(2)}`;
      }),
      datasets: [
        {
          data: last6Months.map(date => {
            const found = bookingsByMonth.find(item => item._id === date);
            return found ? found.count : 0;
          })
        }
      ]
    };
    
    const monthlyRevenueData = {
      labels: last6Months.map(date => {
        const [year, month] = date.split('-');
        return `${month}/${year.substring(2)}`;
      }),
      datasets: [
        {
          data: last6Months.map(date => {
            const found = bookingsByMonth.find(item => item._id === date);
            return found ? found.revenue : 0;
          })
        }
      ]
    };
    
    res.sendSuccess(
      {
        totalRevenue,
        totalBookings: bookingCount,
        activeCustomers: userCount,
        activeProfessionals: professionalCount,
        revenueChange: 0, // TODO: Calculate change percentage
        bookingsChange: 0, // TODO: Calculate change percentage
        customersChange: 0, // TODO: Calculate change percentage
        professionalsChange: 0, // TODO: Calculate change percentage
        chartData: {
          bookings: {
            daily: dailyChartData,
            weekly: monthlyChartData, // Simplified for now
            monthly: monthlyChartData
          },
          revenue: {
            daily: dailyRevenueData,
            weekly: monthlyRevenueData, // Simplified for now
            monthly: monthlyRevenueData
          }
        }
      },
      'Dashboard stats retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get all users (with filtering)
export const getAllUsers = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access user list.', 403);
    }
    
    const { role, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const users = await User.find(query)
      .select('name email phone role profileImage createdAt isPhoneVerified status')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    res.sendSuccess(
      users,
      'Users retrieved successfully',
      {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      }
    );
  } catch (error) {
    next(error);
  }
};

// Get user details
export const getUserDetails = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access user details.', 403);
    }
    
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.sendError('User not found', 404);
    }
    
    // Get user's bookings if they are a customer or professional
    let bookings = [];
    if (user.role === 'customer' || user.role === 'professional') {
      const bookingQuery = user.role === 'customer' 
        ? { customer: userId }
        : { professional: userId };
      
      bookings = await Booking.find(bookingQuery)
        .sort('-createdAt')
        .limit(5)
        .populate('service', 'name')
        .populate(user.role === 'customer' ? 'professional' : 'customer', 'name');
    }
    
    res.sendSuccess(
      {
        user,
        bookings: bookings.map(booking => ({
          id: booking._id,
          serviceName: booking.service.name,
          otherPartyName: user.role === 'customer' 
            ? booking.professional?.name || 'Unassigned'
            : booking.customer.name,
          date: booking.scheduledDate,
          status: booking.status,
          amount: booking.totalAmount
        }))
      },
      'User details retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Create a new user
export const createUser = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can create users.', 403);
    }
    
    const { name, email, phone, role, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !role || !password) {
      return res.sendError('Please provide all required fields', 400);
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.sendError('User with this email or phone already exists', 400);
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      phone,
      role,
      password, // Will be hashed by the model pre-save hook
      isPhoneVerified: true, // Admin-created users are pre-verified
      profileComplete: true
    });
    
    await user.save();
    
    res.sendSuccess(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      'User created successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Update user
export const updateUser = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can update users.', 403);
    }
    
    const { userId } = req.params;
    const { name, email, phone, role, status } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.sendError('User not found', 404);
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
        status: user.status
      },
      'User updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can delete users.', 403);
    }
    
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.sendError('User not found', 404);
    }
    
    // Check if user has associated bookings
    const bookingCount = await Booking.countDocuments({
      $or: [{ customer: userId }, { professional: userId }]
    });
    
    if (bookingCount > 0) {
      return res.sendError('Cannot delete user with associated bookings. Please handle bookings first.', 400);
    }
    
    await User.findByIdAndDelete(userId);
    
    res.sendSuccess(
      null,
      'User deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get all bookings (for admin)
export const getAllBookings = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access all bookings.', 403);
    }
    
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (status && status !== 'all') query.status = status;
    
    // Execute query with pagination
    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate('professional', 'name email phone')
      .populate('service', 'title price')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Booking.countDocuments(query);
    
    res.sendSuccess(
      bookings.map(booking => ({
        id: booking._id,
        customerName: booking.customer?.name || 'Unknown Customer',
        professionalName: booking.professional?.name || 'Unassigned',
        serviceName: booking.service?.title || 'Unknown Service',
        status: booking.status,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        totalAmount: booking.totalAmount,
        createdAt: booking.createdAt,
        address: booking.address
      })),
      'Bookings retrieved successfully',
      {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        hasMore: skip + bookings.length < total
      }
    );
  } catch (error) {
    next(error);
  }
};

// Get booking details
export const getBookingDetails = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access booking details.', 403);
    }
    
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId)
      .populate('customer', 'name email phone profileImage')
      .populate('professional', 'name email phone profileImage rating')
      .populate('service', 'title description price duration');
    
    if (!booking) {
      return res.sendError('Booking not found', 404);
    }
    
    res.sendSuccess(
      {
        id: booking._id,
        customer: booking.customer,
        professional: booking.professional,
        service: booking.service,
        status: booking.status,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        totalAmount: booking.totalAmount,
        address: booking.address,
        notes: booking.notes,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      },
      'Booking details retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Update booking
export const updateBooking = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can update bookings.', 403);
    }
    
    const { bookingId } = req.params;
    const { status, professional, notes } = req.body;
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.sendError('Booking not found', 404);
    }
    
    // Update fields if provided
    if (status) booking.status = status;
    if (professional) booking.professional = professional;
    if (notes) booking.notes = notes;
    
    await booking.save();
    
    // Populate the updated booking
    await booking.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'professional', select: 'name email phone' },
      { path: 'service', select: 'title price' }
    ]);
    
    res.sendSuccess(
      {
        id: booking._id,
        customerName: booking.customer?.name || 'Unknown Customer',
        professionalName: booking.professional?.name || 'Unassigned',
        serviceName: booking.service?.title || 'Unknown Service',
        status: booking.status,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        totalAmount: booking.totalAmount,
        notes: booking.notes,
        updatedAt: booking.updatedAt
      },
      'Booking updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get all professionals (for admin)
export const getAllProfessionals = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access professionals list.', 403);
    }
    
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { role: 'professional' };
    if (status && status !== 'all') query.status = status;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const professionals = await User.find(query)
      .select('name email phone profileImage rating isVerified status createdAt')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Get additional stats for each professional
    const professionalsWithStats = await Promise.all(
      professionals.map(async (professional) => {
        const bookingStats = await Booking.aggregate([
          { $match: { professional: professional._id } },
          {
            $group: {
              _id: null,
              totalJobs: { $sum: 1 },
              completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              totalEarnings: { $sum: '$totalAmount' }
            }
          }
        ]);
        
        const stats = bookingStats[0] || { totalJobs: 0, completedJobs: 0, totalEarnings: 0 };
        
        return {
          id: professional._id,
          _id: professional._id, // For compatibility
          name: professional.name,
          email: professional.email,
          phone: professional.phone,
          profileImage: professional.profileImage?.url || '',
          rating: professional.rating || 0,
          isVerified: professional.isVerified || false,
          status: professional.status || 'active',
          totalJobs: stats.totalJobs,
          completedJobs: stats.completedJobs,
          totalEarnings: stats.totalEarnings,
          joinedDate: professional.createdAt
        };
      })
    );
    
    res.sendSuccess(
      professionalsWithStats,
      'Professionals retrieved successfully',
      {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        hasMore: skip + professionals.length < total
      }
    );
  } catch (error) {
    next(error);
  }
};

// Get professional details
export const getProfessionalDetails = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access professional details.', 403);
    }
    
    const { professionalId } = req.params;
    
    const professional = await User.findOne({ _id: professionalId, role: 'professional' });
    
    if (!professional) {
      return res.sendError('Professional not found', 404);
    }
    
    // Get professional's bookings
    const bookings = await Booking.find({ professional: professionalId })
      .sort('-createdAt')
      .limit(10)
      .populate('customer', 'name')
      .populate('service', 'title');
    
    res.sendSuccess(
      {
        id: professional._id,
        name: professional.name,
        email: professional.email,
        phone: professional.phone,
        profileImage: professional.profileImage,
        rating: professional.rating,
        isVerified: professional.isVerified,
        status: professional.status,
        createdAt: professional.createdAt,
        recentBookings: bookings.map(booking => ({
          id: booking._id,
          customerName: booking.customer.name,
          serviceName: booking.service.title,
          status: booking.status,
          amount: booking.totalAmount,
          date: booking.scheduledDate
        }))
      },
      'Professional details retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Update professional
export const updateProfessional = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can update professionals.', 403);
    }
    
    const { professionalId } = req.params;
    const { name, email, phone, status } = req.body;
    
    const professional = await User.findOne({ _id: professionalId, role: 'professional' });
    
    if (!professional) {
      return res.sendError('Professional not found', 404);
    }
    
    // Update fields if provided
    if (name) professional.name = name;
    if (email) professional.email = email;
    if (phone) professional.phone = phone;
    if (status) professional.status = status;
    
    await professional.save();
    
    res.sendSuccess(
      {
        id: professional._id,
        name: professional.name,
        email: professional.email,
        phone: professional.phone,
        status: professional.status,
        isVerified: professional.isVerified
      },
      'Professional updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Update professional verification
export const updateProfessionalVerification = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can update professional verification.', 403);
    }
    
    const { professionalId } = req.params;
    const { isVerified, verificationNotes } = req.body;
    
    const professional = await User.findOne({ _id: professionalId, role: 'professional' });
    
    if (!professional) {
      return res.sendError('Professional not found', 404);
    }
    
    // Update verification status
    professional.isVerified = isVerified;
    if (verificationNotes) {
      professional.verificationNotes = verificationNotes;
    }
    
    await professional.save();
    
    res.sendSuccess(
      {
        id: professional._id,
        name: professional.name,
        isVerified: professional.isVerified,
        verificationNotes: professional.verificationNotes
      },
      'Professional verification updated successfully'
    );
  } catch (error) {
    next(error);
  }
};