import Testimonial from '../models/testimonialModel.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { AppError } from '../utils/appError.js';
import { upload, deleteImage } from '../utils/cloudinary.js';

// Middleware for uploading testimonial thumbnail
export const uploadTestimonialImage = upload.single('thumbnail');

// @desc    Get all testimonials
// @route   GET /api/testimonials
// @access  Public
export const getAllTestimonials = asyncHandler(async (req, res, next) => {
    const testimonials = await Testimonial.find({}).sort({ createdAt: -1 });
    res.status(200).json({
        status: 'success',
        results: testimonials.length,
        data: testimonials,
    });
});

// @desc    Create a new testimonial
// @route   POST /api/testimonials
// @access  Private (Admin)
export const createTestimonial = asyncHandler(async (req, res, next) => {
    let imageData = null;

    try {
        const { name, instagramUrl } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return next(new AppError('Name is required', 400));
        }
        if (!instagramUrl || !instagramUrl.trim()) {
            return next(new AppError('Instagram URL is required', 400));
        }

        // Handle image upload
        if (!req.file) {
            return next(new AppError('Thumbnail image is required', 400));
        }

        imageData = {
            public_id: req.file.filename,
            url: req.file.path
        };

        const newTestimonial = await Testimonial.create({
            name: name.trim(),
            instagramUrl: instagramUrl.trim(),
            thumbnail: imageData
        });

        res.status(201).json({
            status: 'success',
            message: 'Testimonial created successfully',
            data: newTestimonial,
        });
    } catch (error) {
        // Cleanup uploaded image if database creation fails
        if (req.file && req.file.filename) {
            try {
                await deleteImage(req.file.filename);
            } catch (deleteError) {
                console.error('Error deleting uploaded image:', deleteError);
            }
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return next(new AppError(messages.join(', '), 400));
        }

        console.error('Error creating testimonial:', error);
        return next(new AppError('Failed to create testimonial', 500));
    }
});

// @desc    Delete a testimonial by ID
// @route   DELETE /api/testimonials/:id
// @access  Private (Admin)
export const deleteTestimonial = asyncHandler(async (req, res, next) => {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
        return next(new AppError('Testimonial not found', 404));
    }

    // Delete image from Cloudinary if it exists and has a public_id
    if (testimonial.thumbnail && testimonial.thumbnail.public_id) {
        await deleteImage(testimonial.thumbnail.public_id);
    }

    await Testimonial.findByIdAndDelete(req.params.id);

    res.status(204).json({
        status: 'success',
        data: null,
    });
});