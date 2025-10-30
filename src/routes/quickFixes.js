import express from 'express';
const router = express.Router();
import * as quickFixController from '../controllers/quickFixController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

// @route   GET /api/quick-fixes
// @desc    Get all quick fixes
// @access  Public
router.get('/', quickFixController.getQuickFixes);

// @route   POST /api/quick-fixes
// @desc    Create a new quick fix
// @access  Private/Admin
router.post('/', protect, restrictTo('admin'), quickFixController.createQuickFix);

// @route   PUT /api/quick-fixes/:id
// @desc    Update a quick fix
// @access  Private/Admin
router.put('/:id', protect, restrictTo('admin'), quickFixController.updateQuickFix);

// @route   DELETE /api/quick-fixes/:id
// @desc    Delete a quick fix
// @access  Private/Admin
router.delete('/:id', protect, restrictTo('admin'), quickFixController.deleteQuickFix);

export default router;
