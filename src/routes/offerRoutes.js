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
  getOfferStats
} from '../controllers/offerController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import { offerSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveOffers);
router.get('/featured', getFeaturedOffers);
router.get('/validate/:code', validateOfferCode);
router.get('/:id', getOffer);

// Protected routes - require authentication
router.use(protect);

// Routes for authenticated users
router.post('/:id/use', useOffer); // Use an offer during booking

// Routes for professionals and admins
router.get('/', restrictTo('professional', 'admin'), getAllOffers);
router.post('/', restrictTo('professional', 'admin'), validateBody(offerSchemas.createOffer), createOffer);

router.route('/:id')
  .patch(restrictTo('professional', 'admin'), validateBody(offerSchemas.updateOffer), updateOffer)
  .delete(restrictTo('professional', 'admin'), deleteOffer);

// Activation/Deactivation routes
router.patch('/:id/activate', restrictTo('professional', 'admin'), activateOffer);
router.patch('/:id/deactivate', restrictTo('professional', 'admin'), deactivateOffer);

// Admin only routes
router.get('/stats', restrictTo('admin'), getOfferStats);

export default router;