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
import { protect, restrictTo } from '../middleware/auth.js';
import { cacheGet } from '../middleware/cache.js';

const router = express.Router();

// Public routes (with caching)
router.get('/', cacheGet(60_000), getAllServices);
router.get('/popular', cacheGet(60_000), getPopularServices);
router.get('/top-services', cacheGet(60_000), getTopServices);
router.get('/categories', cacheGet(300_000), getServiceCategories);
router.get('/categories/:category', cacheGet(60_000), getServicesByCategory);
router.get('/search', cacheGet(30_000), searchServices);
router.get('/:id', cacheGet(120_000), getService);

// Protected routes
router.use(protect);

// Routes for professionals and admins
router.post('/', restrictTo('admin'), createService);

router.route('/:id')
  .patch(restrictTo('admin'), updateService)
  .delete(restrictTo('admin'), deleteService);

// Admin only routes
router.get('/stats', restrictTo('admin'), getServiceStats);

export default router;