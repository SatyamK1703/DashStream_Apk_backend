import Service from "../models/serviceModel.js";
import { asyncHandler, AppError } from "../middleware/errorMiddleware.js";

/**
 * Get all services
 * @route GET /api/services
 */
export const getAllServices = asyncHandler(async (req, res, next) => {
  // Build query
  let query = Service.find();
  
  // Filter by category if provided
  if (req.query.category) {
    query = query.find({ category: req.query.category });
  }
  
  // Filter by vehicle type if provided
  if (req.query.vehicleType) {
    query = query.find({ vehicleType: req.query.vehicleType });
  }
  
  // Filter by price range if provided
  if (req.query.minPrice && req.query.maxPrice) {
    query = query.find({
      price: { $gte: req.query.minPrice, $lte: req.query.maxPrice }
    });
  } else if (req.query.minPrice) {
    query = query.find({ price: { $gte: req.query.minPrice } });
  } else if (req.query.maxPrice) {
    query = query.find({ price: { $lte: req.query.maxPrice } });
  }
  
  // Sort by popularity, price, or rating
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-popularity');
  }
  
  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;
  
  query = query.skip(skip).limit(limit);
  
  // Execute query
  const services = await query;
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    data: {
      services
    }
  });
});

/**
 * Get service by ID
 * @route GET /api/services/:id
 */
export const getService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      service
    }
  });
});

/**
 * Create new service
 * @route POST /api/services
 */
export const createService = asyncHandler(async (req, res, next) => {
  // Add creator if not provided
  if (!req.body.creator) {
    req.body.creator = req.user.id;
  }
  
  const newService = await Service.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      service: newService
    }
  });
});

/**
 * Update service
 * @route PATCH /api/services/:id
 */
export const updateService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }
  
  // Check if user is authorized to update this service
  if (
    req.user.role !== 'admin' &&
    service.creator.toString() !== req.user.id
  ) {
    return next(new AppError('You are not authorized to update this service', 403));
  }
  
  const updatedService = await Service.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      service: updatedService
    }
  });
});

/**
 * Delete service
 * @route DELETE /api/services/:id
 */
export const deleteService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }
  
  // Check if user is authorized to delete this service
  if (
    req.user.role !== 'admin' &&
    service.creator.toString() !== req.user.id
  ) {
    return next(new AppError('You are not authorized to delete this service', 403));
  }
  
  await Service.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * Get top 5 popular services
 * @route GET /api/services/top-services
 */
export const getTopServices = asyncHandler(async (req, res, next) => {
  const services = await Service.find()
    .sort('-popularity -rating')
    .limit(5);
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    data: {
      services
    }
  });
});

/**
 * Get services by category
 * @route GET /api/services/categories/:category
 */
export const getServicesByCategory = asyncHandler(async (req, res, next) => {
  const services = await Service.find({ category: req.params.category });
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    data: {
      services
    }
  });
});

/**
 * Get service categories
 * @route GET /api/services/categories
 */
export const getServiceCategories = asyncHandler(async (req, res, next) => {
  const categories = await Service.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        services: { $push: { id: '$_id', name: '$name', price: '$price' } }
      }
    },
    {
      $project: {
        category: '$_id',
        count: 1,
        services: { $slice: ['$services', 5] },
        _id: 0
      }
    }
  ]);
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories
    }
  });
});

/**
 * Search services
 * @route GET /api/services/search
 */
export const searchServices = asyncHandler(async (req, res, next) => {
  if (!req.query.q) {
    return next(new AppError('Please provide a search query', 400));
  }
  
  const searchQuery = req.query.q;
  
  const services = await Service.find({
    $or: [
      { name: { $regex: searchQuery, $options: 'i' } },
      { description: { $regex: searchQuery, $options: 'i' } },
      { category: { $regex: searchQuery, $options: 'i' } },
      { tags: { $regex: searchQuery, $options: 'i' } }
    ]
  });
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    data: {
      services
    }
  });
});

/**
 * Get service statistics
 * @route GET /api/services/stats
 */
export const getServiceStats = asyncHandler(async (req, res, next) => {
  const stats = await Service.aggregate([
    {
      $group: {
        _id: '$category',
        numServices: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        avgRating: { $avg: '$rating' }
      }
    },
    {
      $sort: { numServices: -1 }
    }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});