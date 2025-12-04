import InstagramReels from '../models/instagramModel.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { AppError } from '../utils/appError.js';


// @desc    ADD a new Instagram reel entry In app
// @route   POST /api/instagram/reels
// @access  Public

export const addInstagramReel = asyncHandler(async (req, res, next) => {
    try {
        const { reelPreviewImage, reelName, reelLink } = req.body;

        const newReel = await InstagramReels.create({
            reelPreviewImage,
            reelName,
            reelLink
        });

        res.status(201).json({
            status: 'success',
            data: { reel: newReel },
        });
    } catch (error) {
        console.error('Error adding Instagram reel:', error);
        return next(new AppError(`Failed to add Instagram reel: ${error.message}`, 500));
    }
});


// @desc    Get all Instagram reels
// @route   GET /api/instagram/reels
// @access  Public
export const getAllInstagramReels = asyncHandler(async (req, res, next) => {
    const reels = await InstagramReels.find({});
    res.status(200).json({
        status: 'success',
        results: reels.length,
        data: { reels },
    });
});


// @desc    Get an Instagram reel by ID
// @route   GET /api/instagram/reels/:id
// @access  Public
export const getInstagramReel = asyncHandler(async (req, res, next) => {
    const reel = await InstagramReels.findById(req.params.id);
    if (!reel) {
        return next(new AppError('Instagram reel not found', 404));
    }
    res.status(200).json({
        status: 'success',
        data: { reel },
    });
});


// @desc    Delete an Instagram reel by ID
// @route   DELETE /api/instagram/reels/:id
// @access  Public
export const deleteInstagramReel = asyncHandler(async (req, res, next) => {
    const reel = await InstagramReels.findByIdAndDelete(req.params.id);
    if (!reel) {
        return next(new AppError('Instagram reel not found', 404));
    }
    res.status(204).json({
        status: 'success',
        data: null,
    });
});



 