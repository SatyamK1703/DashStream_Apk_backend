import express from 'express';
import {
  getAllOffers,
  getActiveOffers,
  getFeaturedOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  activateOffer,
  deactivateOffer,
  useOffer,
  validateOfferCode,
  getOfferStats,
  getOfferUsageDetails,
  getSpecificOfferStats,
  updateOfferLimits
} from '../controllers/offerController.js';
import { upload as uploadImage } from '../utils/cloudinary.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveOffers);
router.get('/featured', getFeaturedOffers);
router.get('/validate/:code', validateOfferCode);
router.get('/:id', getOffer);

// Protected routes - require authentication
router.use(protect);

// Routes for authenticated users
router.get('/', getAllOffers); // Get all available offers for authenticated users
router.post('/:id/use', useOffer); // Use an offer during booking

// Admin only routes for offer management
router.get('/admin', restrictTo('admin'), getAllOffers);
router.post('/', restrictTo( 'admin'),createOffer);

router.route('/:id')
  .patch(restrictTo( 'admin'),updateOffer)
  .delete(restrictTo( 'admin'), deleteOffer);

// Activation/Deactivation routes
router.patch('/:id/activate', restrictTo( 'admin'), activateOffer);
router.patch('/:id/deactivate', restrictTo( 'admin'), deactivateOffer);

// Admin only routes
router.get('/stats', restrictTo('admin'), getOfferStats);
router.get('/:id/stats', restrictTo('admin'), getSpecificOfferStats); // New comprehensive stats function
router.get('/:id/usage-details', restrictTo('admin'), getOfferUsageDetails);
router.patch('/:id/limits', restrictTo('admin'), updateOfferLimits);

export default router;