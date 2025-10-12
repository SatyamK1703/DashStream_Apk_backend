import express from 'express';
import {
  createBooking,
  getAllBookings,
  getBooking,
  getMyBookings,
  updateBookingStatus,
  cancelBooking,
  addTrackingUpdate,
  rateBooking,
  getBookingStats
} from '../controllers/bookingController.js';

import { protect,restrictTo } from '../middleware/auth.js';



const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Routes for all authenticated users
router.get('/my-bookings', getMyBookings);
router.post('/', restrictTo('customer'),createBooking);

// Routes for specific bookings
router.route('/:id')
  .get(getBooking);

router.patch('/:id/status', updateBookingStatus);
router.patch('/:id/cancel', cancelBooking);
router.post('/:id/tracking', restrictTo('professional', 'admin'), addTrackingUpdate);
router.post('/:id/rate', restrictTo('customer'), rateBooking);

// Stats route - accessible to professionals and admins
router.get('/stats', restrictTo('professional', 'admin'), getBookingStats);

// Admin only routes
router.get('/', restrictTo('admin'), getAllBookings);

export default router;
