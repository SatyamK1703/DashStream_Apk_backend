import express from 'express';
import {
  getAllTestimonials,
  createTestimonial,
  deleteTestimonial,
  uploadTestimonialImage
} from '../controllers/testimonialController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { testimonialSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Public routes
router.get('/', getAllTestimonials);

// Protected routes (Admin only)
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', uploadTestimonialImage, validateBody(testimonialSchemas.createTestimonial), createTestimonial);
router.delete('/:id', deleteTestimonial);

export default router;