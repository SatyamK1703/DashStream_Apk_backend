import asyncHandler from 'express-async-handler';
import QuickFix from '../models/QuickFix.js';
import { AppError } from '../utils/appError.js';

// @desc    Get all quick fixes
// @route   GET /api/quick-fixes
// @access  Public
const getQuickFixes = asyncHandler(async (req, res) => {
  const quickFixes = await QuickFix.find({});
  res.json(quickFixes);
});

// @desc    Create a new quick fix
// @route   POST /api/quick-fixes
// @access  Private/Admin
const createQuickFix = asyncHandler(async (req, res) => {
  const { label, image, isActive } = req.body;

  const quickFix = new QuickFix({
    label,
    image,
    isActive,
  });

  const createdQuickFix = await quickFix.save();
  res.status(201).json(createdQuickFix);
});

// @desc    Update a quick fix
// @route   PUT /api/quick-fixes/:id
// @access  Private/Admin
const updateQuickFix = asyncHandler(async (req, res) => {
  const { label, image, isActive } = req.body;

  const quickFix = await QuickFix.findById(req.params.id);

  if (quickFix) {
    quickFix.label = label || quickFix.label;
    quickFix.image = image || quickFix.image;
    if (isActive !== undefined) {
      quickFix.isActive = isActive;
    }

    const updatedQuickFix = await quickFix.save();
    res.json(updatedQuickFix);
  } else {
    throw new AppError('Quick fix not found', 404);
  }
});

// @desc    Delete a quick fix
// @route   DELETE /api/quick-fixes/:id
// @access  Private/Admin
const deleteQuickFix = asyncHandler(async (req, res) => {
  const quickFix = await QuickFix.findById(req.params.id);

  if (quickFix) {
    await QuickFix.deleteOne({ _id: req.params.id });
    res.json({ message: 'Quick fix removed' });
  } else {
    throw new AppError('Quick fix not found', 404);
  }
});

export { getQuickFixes, createQuickFix, updateQuickFix, deleteQuickFix };
