import express from 'express';
import {
  createBooking,
  getAllBookings,
  getBooking,
  getMyBookings,
  updateBookingStatus,
  addTrackingUpdate,
  rateBooking,
  getBookingStats
} from '../controllers/bookingController.js';
import {restrictTo , protect } from '../controllers/authController.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import { bookingSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Routes for all authenticated users
router.get('/my-bookings', getMyBookings);
router.post('/', restrictTo('customer'), validateBody(bookingSchemas.createBooking), createBooking);

// Routes for specific bookings
router.route('/:id')
  .get(getBooking);

router.patch('/:id/status', validateBody(bookingSchemas.updateBookingStatus), updateBookingStatus);
router.post('/:id/tracking', restrictTo('professional', 'admin'), validateBody(bookingSchemas.addTrackingUpdate), addTrackingUpdate);
router.post('/:id/rate', restrictTo('customer'), validateBody(bookingSchemas.rateBooking), rateBooking);

// Stats route - accessible to professionals and admins
router.get('/stats', restrictTo('professional', 'admin'), getBookingStats);

// Admin only routes
router.get('/', restrictTo('admin'), getAllBookings);

export default router;
