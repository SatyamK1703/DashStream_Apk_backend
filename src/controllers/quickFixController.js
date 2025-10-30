import asyncHandler from 'express-async-handler';
import QuickFix from '../models/QuickFix.js';

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
  const { label, image } = req.body;

  const quickFix = new QuickFix({
    label,
    image,
  });

  const createdQuickFix = await quickFix.save();
  res.status(201).json(createdQuickFix);
});

// @desc    Update a quick fix
// @route   PUT /api/quick-fixes/:id
// @access  Private/Admin
const updateQuickFix = asyncHandler(async (req, res) => {
  const { label, image } = req.body;

  const quickFix = await QuickFix.findById(req.params.id);

  if (quickFix) {
    quickFix.label = label || quickFix.label;
    quickFix.image = image || quickFix.image;

    const updatedQuickFix = await quickFix.save();
    res.json(updatedQuickFix);
  } else {
    res.status(404);
    throw new Error('Quick fix not found');
  }
});

// @desc    Delete a quick fix
// @route   DELETE /api/quick-fixes/:id
// @access  Private/Admin
const deleteQuickFix = asyncHandler(async (req, res) => {
  const quickFix = await QuickFix.findById(req.params.id);

  if (quickFix) {
    await quickFix.remove();
    res.json({ message: 'Quick fix removed' });
  } else {
    res.status(404);
    throw new Error('Quick fix not found');
  }
});

export { getQuickFixes, createQuickFix, updateQuickFix, deleteQuickFix };
