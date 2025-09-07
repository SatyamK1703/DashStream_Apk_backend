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
  getServiceStats,
  getPopularServices
} from '../controllers/serviceController.js';
import { protect, restrictTo } from '../controllers/authController.js';


const router = express.Router();

// Public routes
router.get('/', getAllServices);
router.get('/popular', getPopularServices);
router.get('/top-services', getTopServices);
router.get('/categories', getServiceCategories);
router.get('/categories/:category', getServicesByCategory);
router.get('/search', searchServices);
router.get('/:id', getService);

// Protected routes
router.use(protect);

// Routes for professionals and admins
router.post('/', restrictTo( 'admin'),createService);

router.route('/:id')
  .patch(restrictTo( 'admin'),  updateService)
  .delete(restrictTo( 'admin'), deleteService);

// Admin only routes
router.get('/stats', restrictTo('admin'), getServiceStats);

export default router;