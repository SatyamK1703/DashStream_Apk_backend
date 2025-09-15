import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  getAllBookings,
  getBookingDetails,
  updateBooking,
  getAllProfessionals,
  getProfessionalDetails,
  updateProfessional,
  updateProfessionalVerification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/adminController.js';

// Service management now handled via /api/services routes

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard routes
router.get('/dashboard', getDashboardStats);

// User management routes
router.route('/users')
  .get(getAllUsers)
  .post(createUser);

router.route('/users/:userId')
  .get(getUserDetails)
  .patch(updateUser)
  .delete(deleteUser);

// Booking management routes
router.route('/bookings')
  .get(getAllBookings);

router.route('/bookings/:bookingId')
  .get(getBookingDetails)
  .patch(updateBooking);

// Service management routes moved to /api/services 
// Use /api/services endpoints with admin authentication instead

// Professional management routes
router.route('/professionals')
  .get(getAllProfessionals);

router.route('/professionals/:professionalId')
  .get(getProfessionalDetails)
  .patch(updateProfessional);

router.route('/professionals/:professionalId/verification')
  .patch(updateProfessionalVerification);

export default router;