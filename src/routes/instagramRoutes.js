import express from 'express';
import {
  addInstagramReel,
  getAllInstagramReels,
  getInstagramReel,
  deleteInstagramReel,
  uploadReelImage
} from '../controllers/instagramController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js'; // Assuming auth is needed for add/delete

const router = express.Router();

// Public routes
router.get('/', getAllInstagramReels);
router.get('/:id', getInstagramReel);

// Protected routes (Admin only)
// Assuming only admins should add/delete reels. If this is for users, remove 'restrictTo'.
// Adjust 'admin' role check as per your project's roles
router.use(protect);
router.use(restrictTo('admin'));

router.post('/', uploadReelImage, addInstagramReel);
router.delete('/:id', deleteInstagramReel);

export default router;
