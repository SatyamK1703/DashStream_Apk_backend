import Booking from '../models/bookingModel.js';
import User from '../models/userModel.js';

// Get all jobs for a professional
export const getProfessionalJobs = async (req, res, next) => {
  try {
    const professionalId = req.user._id;
    
    // Verify user is a professional
    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can access jobs.', 403);
    }
    
    // Find all bookings assigned to this professional
    const bookings = await Booking.find({ professional: professionalId })
      .populate('customer', 'name profileImage')
      .populate('service', 'name price')
      .sort('-createdAt');
    
    // Transform bookings to job format
    const jobs = bookings.map(booking => ({
      id: booking._id,
      customerName: booking.customer.name,
      customerImage: booking.customer.profileImage?.url || '',
      date: booking.scheduledDate,
      time: booking.scheduledTime,
      address: booking.address.formattedAddress,
      totalAmount: booking.totalAmount,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      serviceName: booking.service.name,
      createdAt: booking.createdAt
    }));
    
    res.sendSuccess(
      jobs,
      'Professional jobs retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get job details
export const getJobDetails = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const professionalId = req.user._id;
    
    // Verify user is a professional
    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can access job details.', 403);
    }
    
    // Find the booking
    const booking = await Booking.findOne({
      _id: jobId,
      professional: professionalId
    })
      .populate('customer', 'name phone email profileImage')
      .populate('service', 'name description price duration')
      .populate('address');
    
    if (!booking) {
      return res.sendError('Job not found or not assigned to you', 404);
    }
    
    // Transform booking to detailed job format
    const jobDetails = {
      id: booking._id,
      customer: {
        id: booking.customer._id,
        name: booking.customer.name,
        phone: booking.customer.phone,
        email: booking.customer.email,
        image: booking.customer.profileImage?.url || ''
      },
      service: {
        id: booking.service._id,
        name: booking.service.name,
        description: booking.service.description,
        price: booking.service.price,
        duration: booking.service.duration
      },
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      address: {
        formattedAddress: booking.address.formattedAddress,
        street: booking.address.street,
        city: booking.address.city,
        state: booking.address.state,
        postalCode: booking.address.postalCode,
        country: booking.address.country,
        coordinates: booking.address.coordinates
      },
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalAmount: booking.totalAmount,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
    
    res.sendSuccess(
      jobDetails,
      'Job details retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Update job status
export const updateJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;
    const professionalId = req.user._id;
    
    // Validate status
    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.sendError('Invalid status. Must be one of: ' + validStatuses.join(', '), 400);
    }
    
    // Verify user is a professional
    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can update job status.', 403);
    }
    
    // Find the booking
    const booking = await Booking.findOne({
      _id: jobId,
      professional: professionalId
    });
    
    if (!booking) {
      return res.sendError('Job not found or not assigned to you', 404);
    }
    
    // Update status
    booking.status = status;
    
    // If completed, update completion time
    if (status === 'completed') {
      booking.completedAt = new Date();
    }
    
    await booking.save();
    
    res.sendSuccess(
      { id: booking._id, status: booking.status },
      'Job status updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get professional dashboard stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const professionalId = req.user._id;
    
    // Verify user is a professional
    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can access dashboard stats.', 403);
    }
    
    // Get counts by status
    const upcomingCount = await Booking.countDocuments({
      professional: professionalId,
      status: 'upcoming'
    });
    
    const ongoingCount = await Booking.countDocuments({
      professional: professionalId,
      status: 'ongoing'
    });
    
    const completedCount = await Booking.countDocuments({
      professional: professionalId,
      status: 'completed'
    });
    
    const cancelledCount = await Booking.countDocuments({
      professional: professionalId,
      status: 'cancelled'
    });
    
    // Get total earnings
    const completedBookings = await Booking.find({
      professional: professionalId,
      status: 'completed',
      paymentStatus: 'paid'
    });
    
    const totalEarnings = completedBookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );
    
    // Get today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = await Booking.find({
      professional: professionalId,
      scheduledDate: today.toISOString().split('T')[0]
    }).sort('scheduledTime');
    
    const todayJobs = todayBookings.map(booking => ({
      id: booking._id,
      time: booking.scheduledTime,
      status: booking.status,
      address: booking.address.formattedAddress
    }));
    
    res.sendSuccess(
      {
        jobCounts: {
          upcoming: upcomingCount,
          ongoing: ongoingCount,
          completed: completedCount,
          cancelled: cancelledCount,
          total: upcomingCount + ongoingCount + completedCount + cancelledCount
        },
        earnings: {
          total: totalEarnings,
          currency: 'INR'
        },
        todayJobs
      },
      'Dashboard stats retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get professional profile
export const getProfessionalProfile = async (req, res, next) => {
  try {
    const professionalId = req.user._id;
    
    // Verify user is a professional
    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can access their profile.', 403);
    }
    
    const professional = await User.findById(professionalId).select(
      'name email phone profileImage specialization experience rating totalRatings isAvailable status'
    );
    
    if (!professional) {
      return res.sendError('Professional not found', 404);
    }
    
    res.sendSuccess(
      professional,
      'Professional profile retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Update professional profile
export const updateProfessionalProfile = async (req, res, next) => {
  try {
    const professionalId = req.user._id;
    const { specialization, experience, isAvailable, status } = req.body;
    
    // Verify user is a professional
    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can update their profile.', 403);
    }
    
    const professional = await User.findById(professionalId);
    
    if (!professional) {
      return res.sendError('Professional not found', 404);
    }
    
    // Update fields if provided
    if (specialization) professional.specialization = specialization;
    if (experience !== undefined) professional.experience = experience;
    if (isAvailable !== undefined) professional.isAvailable = isAvailable;
    if (status) professional.status = status;
    
    await professional.save();
    
    res.sendSuccess(
      {
        name: professional.name,
        specialization: professional.specialization,
        experience: professional.experience,
        isAvailable: professional.isAvailable,
        status: professional.status
      },
      'Professional profile updated successfully'
    );
  } catch (error) {
    next(error);
  }
};