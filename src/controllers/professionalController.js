import Booking from '../models/bookingModel.js';
import User from '../models/userModel.js';
import Service from '../models/serviceModel.js';
export const getProfessionalJobs = async (req, res, next) => {
  try {
    const professionalId = req.user._id;

    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can access jobs.', 403);
    }

    const bookings = await Booking.find({ professional: professionalId })
      .populate('customer', 'name profileImage')
      .populate('service', 'title price')
      .sort('-createdAt');

    const jobs = bookings.map(booking => ({
      id: booking._id,
      customerName: booking.customer.name,
      customerImage: booking.customer.profileImage?.url || '',
      date: booking.scheduledDate,
      time: booking.scheduledTime,
      address: `${booking.location.address.address}, ${booking.location.address.city}, ${booking.location.address.pincode}`,
      totalAmount: booking.totalAmount,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      serviceName: booking.services?.map(s => s.title).join(', ') || 'Unknown Service',
      createdAt: booking.createdAt
    }));

    res.sendSuccess(jobs, 'Professional jobs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getJobDetails = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const professionalId = req.user._id;

    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can access job details.', 403);
    }

    const booking = await Booking.findOne({ _id: jobId, professional: professionalId })
      .populate('customer', 'name phone email profileImage')
      .populate('services.serviceId', 'title description price duration');

    if (!booking) {
      return res.sendError('Job not found or not assigned to you', 404);
    }

    const jobDetails = {
      id: booking._id,
      customer: {
        id: booking.customer._id,
        name: booking.customer.name,
        phone: booking.customer.phone,
        email: booking.customer.email,
        image: booking.customer.profileImage?.url || ''
      },
      service: booking.services?.map(s => ({
        id: s.serviceId?._id || s.serviceId,
        title: s.serviceId?.title || s.title,
        description: s.serviceId?.description || '',
        price: s.price,
        duration: s.duration
      })) || [],
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      address: {
        name: booking.location.address.name,
        street: booking.location.address.address,
        city: booking.location.address.city,
        landmark: booking.location.address.landmark,
        pincode: booking.location.address.pincode,
        coordinates: booking.location.coordinates
      },
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalAmount: booking.totalAmount,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };

    res.sendSuccess(jobDetails, 'Job details retrieved successfully');
  } catch (error) {
    next(error);
  }
};


export const updateJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;
    const professionalId = req.user._id;

    const validStatuses = ['pending', 'confirmed', 'assigned', 'in-progress', 'completed', 'cancelled', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.sendError('Invalid status. Must be one of: ' + validStatuses.join(', '), 400);
    }

    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can update job status.', 403);
    }

    const booking = await Booking.findOne({ _id: jobId, professional: professionalId });
    if (!booking) {
      return res.sendError('Job not found or not assigned to you', 404);
    }

    booking.status = status;
    if (status === 'completed') booking.actualEndTime = new Date();

    await booking.save();

    res.sendSuccess({ id: booking._id, status: booking.status }, 'Job status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getProfessionalProfile = async (req, res, next) => {
  try {
    const professionalId = req.user._id;

    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can access their profile.', 403);
    }

    const professional = await User.findById(professionalId);

    if (!professional) return res.sendError('Professional not found', 404);

    res.sendSuccess(professional, 'Professional profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateProfessionalProfile = async (req, res, next) => {
  try {
    const professionalId = req.user._id;
    const { specialization, experience, isAvailable, status } = req.body;

    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can update their profile.', 403);
    }

    const professional = await User.findById(professionalId);
    if (!professional) return res.sendError('Professional not found', 404);
    if (isAvailable !== undefined) professional.isAvailable = isAvailable;
    if (status) professional.status = status;

    await professional.save();

    res.sendSuccess({
      name: professional.name,
      isAvailable: professional.isAvailable,
      status: professional.status
    }, 'Professional profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const professionalId = req.user._id;

    if (req.user.role !== 'professional') {
      return res.sendError('Unauthorized. Only professionals can access dashboard stats.', 403);
    }

    const statuses = ['pending', 'confirmed', 'assigned', 'in-progress', 'completed', 'cancelled', 'rejected'];
    const counts = {};
    for (const status of statuses) {
      counts[status] = await Booking.countDocuments({ professional: professionalId, status });
    }

    const completedBookings = await Booking.find({ professional: professionalId, status: 'completed', paymentStatus: 'paid' });
    const totalEarnings = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayBookings = await Booking.find({
      professional: professionalId,
      scheduledDate: { $gte: todayStart, $lte: todayEnd }
    }).sort('scheduledTime');

    const todayJobs = todayBookings.map(b => ({
      id: b._id,
      time: b.scheduledTime,
      status: b.status,
      address: `${b.location.address.address}, ${b.location.address.city}, ${b.location.address.pincode}`
    }));

    res.sendSuccess({
      jobCounts: { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0) },
      earnings: { total: totalEarnings, currency: 'INR' },
      todayJobs
    }, 'Dashboard stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};
