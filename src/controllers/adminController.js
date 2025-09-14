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
        stats: {
          users: userCount,
          professionals: professionalCount,
          bookings: bookingCount,
          services: serviceCount,
          revenue: totalRevenue
        },
        recentBookings: recentBookings.map(booking => ({
          id: booking._id,
          customerName: booking.customer?.name || 'Unknown Customer',
          professionalName: booking.professional?.name || 'Unassigned',
          serviceName: booking.service?.name || 'Unknown Service',
          date: booking.scheduledDate,
          time: booking.scheduledTime,
          status: booking.status,
          amount: booking.totalAmount || 0
        })),
        topProfessionals: formattedTopProfessionals,
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
      {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      },
      'Users retrieved successfully'
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
      return res.sendError(
        'Cannot delete user with associated bookings. Deactivate the account instead.',
        400
      );
    }
    
    await User.findByIdAndDelete(userId);
    
    res.sendSuccess(
      { id: userId },
      'User deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get all bookings (with filtering)
export const getAllBookings = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access booking list.', 403);
    }
    
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
      .populate('customer', 'name')
      .populate('professional', 'name')
      .populate('service', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Booking.countDocuments(query);
    
    res.sendSuccess(
      {
        bookings: bookings.map(booking => ({
          id: booking._id,
          customerName: booking.customer.name,
          professionalName: booking.professional?.name || 'Unassigned',
          serviceName: booking.service.name,
          date: booking.scheduledDate,
          time: booking.scheduledTime,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          amount: booking.totalAmount,
          createdAt: booking.createdAt
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      },
      'Bookings retrieved successfully'
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
      .populate('customer', 'name phone email')
      .populate('professional', 'name phone email')
      .populate('service', 'name description price')
      .populate('address');
    
    if (!booking) {
      return res.sendError('Booking not found', 404);
    }
    
    // Get payment information
    const payment = await Payment.findOne({ bookingId });
    
    res.sendSuccess(
      {
        booking: {
          id: booking._id,
          customer: {
            id: booking.customer._id,
            name: booking.customer.name,
            phone: booking.customer.phone,
            email: booking.customer.email
          },
          professional: booking.professional ? {
            id: booking.professional._id,
            name: booking.professional.name,
            phone: booking.professional.phone,
            email: booking.professional.email
          } : null,
          service: {
            id: booking.service._id,
            name: booking.service.name,
            description: booking.service.description,
            price: booking.service.price
          },
          address: booking.address,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          totalAmount: booking.totalAmount,
          notes: booking.notes,
          payment: payment ? {
            id: payment._id,
            method: payment.paymentMethod,
            status: payment.status,
            razorpayOrderId: payment.razorpayOrderId,
            createdAt: payment.createdAt
          } : null,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        }
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
    const { status, professionalId, scheduledDate, scheduledTime, notes } = req.body;
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.sendError('Booking not found', 404);
    }
    
    // Update fields if provided
    if (status) booking.status = status;
    if (professionalId) {
      // Verify professional exists
      const professional = await User.findOne({ 
        _id: professionalId,
        role: 'professional'
      });
      
      if (!professional) {
        return res.sendError('Professional not found', 404);
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
        scheduledTime: booking.scheduledTime
      },
      'Booking updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get all services (with filtering)
export const getAllServices = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access service list.', 403);
    }
    
    const { category, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (category) query.category = category;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Execute query with pagination
    const services = await Service.find(query)
      .sort('category name')
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Service.countDocuments(query);
    
    // Get all categories for filtering
    const categories = await Service.distinct('category');
    
    res.sendSuccess(
      {
        services,
        categories,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      },
      'Services retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Create a new service
export const createService = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can create services.', 403);
    }
    
    const { name, description, price, duration, category, image } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !duration || !category) {
      return res.sendError('Please provide all required fields', 400);
    }
    
    // Check if service already exists
    const existingService = await Service.findOne({ name });
    if (existingService) {
      return res.sendError('Service with this name already exists', 400);
    }
    
    // Create new service
    const service = new Service({
      name,
      description,
      price,
      duration,
      category,
      image: image || {}
    });
    
    await service.save();
    
    res.sendSuccess(
      service,
      'Service created successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Update service
export const updateService = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can update services.', 403);
    }
    
    const { serviceId } = req.params;
    const { name, description, price, duration, category, image, isActive } = req.body;
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.sendError('Service not found', 404);
    }
    
    // Update fields if provided
    if (name) service.name = name;
    if (description) service.description = description;
    if (price !== undefined) service.price = price;
    if (duration) service.duration = duration;
    if (category) service.category = category;
    if (image) service.image = image;
    if (isActive !== undefined) service.isActive = isActive;
    
    await service.save();
    
    res.sendSuccess(
      service,
      'Service updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Delete service
export const deleteService = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can delete services.', 403);
    }
    
    const { serviceId } = req.params;
    
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.sendError('Service not found', 404);
    }
    
    // Check if service has associated bookings
    const bookingCount = await Booking.countDocuments({ service: serviceId });
    
    if (bookingCount > 0) {
      return res.sendError(
        'Cannot delete service with associated bookings. Deactivate the service instead.',
        400
      );
    }
    
    await Service.findByIdAndDelete(serviceId);
    
    res.sendSuccess(
      { id: serviceId },
      'Service deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get all professionals (with filtering)
export const getAllProfessionals = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can access professional list.', 403);
    }
    
    const { status, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query for professionals only
    const query = { role: 'professional' };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const professionals = await User.find(query)
      .select('name email phone profileImage createdAt isPhoneVerified status professionalInfo')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Get booking counts for each professional
    const professionalIds = professionals.map(p => p._id);
    const bookingCounts = await Booking.aggregate([
      { $match: { professional: { $in: professionalIds } } },
      { $group: { _id: '$professional', count: { $sum: 1 } } }
    ]);
    
    // Create a map for quick lookup
    const bookingCountMap = {};
    bookingCounts.forEach(item => {
      bookingCountMap[item._id.toString()] = item.count;
    });
    
    res.sendSuccess(
      {
        professionals: professionals.map(prof => ({
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
          createdAt: prof.createdAt
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      },
      'Professionals retrieved successfully'
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
    
    const professional = await User.findOne({ 
      _id: professionalId,
      role: 'professional'
    });
    
    if (!professional) {
      return res.sendError('Professional not found', 404);
    }
    
    // Get professional's bookings
    const bookings = await Booking.find({ professional: professionalId })
      .sort('-createdAt')
      .limit(10)
      .populate('customer', 'name')
      .populate('service', 'name');
    
    // Get professional's ratings and reviews
    const reviews = await Booking.find({ 
      professional: professionalId,
      rating: { $exists: true }
    })
      .populate('customer', 'name')
      .select('rating review customer createdAt')
      .sort('-createdAt')
      .limit(5);
    
    res.sendSuccess(
      {
        professional,
        bookings: bookings.map(booking => ({
          id: booking._id,
          customerName: booking.customer.name,
          serviceName: booking.service.name,
          date: booking.scheduledDate,
          status: booking.status,
          amount: booking.totalAmount
        })),
        reviews: reviews.map(review => ({
          id: review._id,
          customerName: review.customer.name,
          rating: review.rating,
          review: review.review,
          date: review.createdAt
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
    const { name, email, phone, status, specializations, hourlyRate } = req.body;
    
    const professional = await User.findOne({
      _id: professionalId,
      role: 'professional'
    });
    
    if (!professional) {
      return res.sendError('Professional not found', 404);
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
      if (specializations) professional.professionalInfo.specializations = specializations;
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
        professionalInfo: professional.professionalInfo
      },
      'Professional updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Update professional verification status
export const updateProfessionalVerification = async (req, res, next) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'admin') {
      return res.sendError('Unauthorized. Only admins can update verification status.', 403);
    }
    
    const { professionalId } = req.params;
    const { isVerified, verificationNotes } = req.body;
    
    const professional = await User.findOne({
      _id: professionalId,
      role: 'professional'
    });
    
    if (!professional) {
      return res.sendError('Professional not found', 404);
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
        verificationDate: professional.professionalInfo.verificationDate
      },
      `Professional ${isVerified ? 'verified' : 'unverified'} successfully`
    );
  } catch (error) {
    next(error);
  }
};