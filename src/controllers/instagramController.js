import InstagramReels from '../models/instagramModel.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { AppError } from '../utils/appError.js';
import { upload, deleteImage } from '../utils/cloudinary.js';


// Middleware for uploading reel preview image
export const uploadReelImage = upload.single('reelPreviewImage');

// @desc    ADD a new Instagram reel entry In app
// @route   POST /api/instagram/reels
// @access  Public

export const addInstagramReel = asyncHandler(async (req, res, next) => {
    let imageData = null;
    
    try {
        const { reelName, reelLink } = req.body;
        
        // Handle image upload
        if (req.file) {
            imageData = {
                public_id: req.file.filename, // Multer-Cloudinary puts public_id in filename
                url: req.file.path
            };
        } else if (req.body.reelPreviewImage) {
            // Handle case where it might be passed as string (though unlikely with file upload)
            // Assuming it might be a direct URL if not a file
            imageData = {
                url: req.body.reelPreviewImage,
                public_id: null
            };
        }

        if (!imageData && !req.body.reelPreviewImage) {
             return next(new AppError('Reel preview image is required', 400));
        }

        const newReel = await InstagramReels.create({
            reelPreviewImage: imageData,
            reelName,
            reelLink
        });

        res.status(201).json({
            status: 'success',
            data: { reel: newReel },
        });
    } catch (error) {
        // Cleanup uploaded image if database creation fails
        if (req.file && req.file.filename) {
            await deleteImage(req.file.filename);
        }
        console.error('Error adding Instagram reel:', error);
        return next(new AppError(`Failed to add Instagram reel: ${error.message}`, 500));
    }
});


// @desc    Get all Instagram reels
// @route   GET /api/instagram/reels
// @access  Public
export const getAllInstagramReels = asyncHandler(async (req, res, next) => {
    const reels = await InstagramReels.find({}).sort({ createdAt: -1 });
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
    const reel = await InstagramReels.findById(req.params.id);
    
    if (!reel) {
        return next(new AppError('Instagram reel not found', 404));
    }

    // Delete image from Cloudinary if it exists and has a public_id
    if (reel.reelPreviewImage && reel.reelPreviewImage.public_id) {
        await deleteImage(reel.reelPreviewImage.public_id);
    }

    await InstagramReels.findByIdAndDelete(req.params.id);

    res.status(204).json({
        status: 'success',
        data: null,
    });
});
