import express from 'express';
import {
  getAllServices,
  getTopServices,
  getServiceCategories,
  getServicesByCategory,
  searchServices,
  getService,
  createService,
  updateService,
  deleteService,
  getServiceStats
} from '../controllers/serviceController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllServices);
router.get('/top-services', getTopServices);
router.get('/categories', getServiceCategories);
router.get('/categories/:category', getServicesByCategory);
router.get('/search', searchServices);
router.get('/:id', getService);

// Protected routes
router.use(protect);

// Routes for professionals and admins
router.post('/', restrictTo('professional', 'admin'), createService);

router.route('/:id')
  .patch(restrictTo('professional', 'admin'), updateService)
  .delete(restrictTo('professional', 'admin'), deleteService);

// Admin only routes
router.get('/stats', restrictTo('admin'), getServiceStats);

export default router;