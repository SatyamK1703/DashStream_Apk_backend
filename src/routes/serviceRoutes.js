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
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import { serviceSchemas } from '../schemas/validationSchemas.js';

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
router.post('/', restrictTo('professional', 'admin'), validateBody(serviceSchemas.createService), createService);

router.route('/:id')
  .patch(restrictTo('professional', 'admin'), validateBody(serviceSchemas.updateService), updateService)
  .delete(restrictTo('professional', 'admin'), deleteService);

// Admin only routes
router.get('/stats', restrictTo('admin'), getServiceStats);

export default router;