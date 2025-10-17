import express from 'express';
import { upload } from '../utils/cloudinary.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// POST /api/upload/image - Upload a single image to Cloudinary
// Restricted to authenticated admins (adjust as needed)
router.post(
  '/image',
  protect,
  restrictTo('admin'),
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image',
        statusCode: 400,
      });
    }

    // Multer-Cloudinary provides file.path (url) and file.filename (public_id)
    return res.status(201).json({
      status: 'success',
      message: 'Image uploaded successfully',
      url: req.file.path, // for clients expecting top-level url
      data: {
        url: req.file.path,
        public_id: req.file.filename,
      },
    });
  }
);

export default router;