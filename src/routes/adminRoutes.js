import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
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
} from '../controllers/adminController.js';

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

// Service management routes


export default router;