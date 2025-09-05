import Service from "../models/serviceModel.js";
import { asyncHandler, AppError } from "../middleware/errorMiddleware.js";

// GET /api/services/popular
export const getPopularServices = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 5;
  
  const services = await Service.find({ 
    isActive: true,
    isPopular: true 
  })
  .sort('-rating')
  .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    services
  });
});

//GET /api/services/categories/:category
export const getServicesByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;
  
  // Validate category
  const validCategories = ['car wash', 'bike wash', 'detailing', 'maintenance', 'customization', 'other'];
  if (!validCategories.includes(category)) {
    return next(new AppError('Invalid category', 400));
  }
  
  const services = await Service.find({ 
    category,
    isActive: true 
  });
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    services
  });
});

//GET /api/services
export const getAllServices = asyncHandler(async (req, res, next) => {
  // Build query
  let query = Service.find();
  
  // Filter by active status (default to active only)
  if (req.query.showInactive !== 'true') {
    query = query.find({ isActive: true });
  }
  
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
      price: { $gte: parseInt(req.query.minPrice), $lte: parseInt(req.query.maxPrice) }
    });
  } else if (req.query.minPrice) {
    query = query.find({ price: { $gte: parseInt(req.query.minPrice) } });
  } else if (req.query.maxPrice) {
    query = query.find({ price: { $lte: parseInt(req.query.maxPrice) } });
  }
  
  // Filter by search term if provided
  if (req.query.search) {
    query = query.find({
      $or: [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ]
    });
  }
  
  // Filter by popular if requested
  if (req.query.popular === 'true') {
    query = query.find({ isPopular: true });
  }
  
  // Sort by popularity, price, rating, or newest
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  query = query.skip(skip).limit(limit);
  
  // Execute query
  const services = await query;
  
  // Get total count for pagination info
  const totalCount = await Service.countDocuments();
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    services: services
  });
});


 //GET /api/services/:id
export const getService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }
  
  // Get related services in the same category
  const relatedServices = await Service.find({
    category: service.category,
    _id: { $ne: service._id },
    isActive: true
  }).limit(4);
  
  res.status(200).json({
    status: 'success',
    service,
    relatedServices
  });
});


 //POST /api/services
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

//PATCH /api/services/:id
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

//DELETE /api/services/:id
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

//GET /api/services/top-services
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

//GET /api/services/categories/:category
export const getServicesByCategoryId = asyncHandler(async (req, res, next) => {
  const services = await Service.find({ category: req.params.category });
  
  res.status(200).json({
    status: 'success',
    results: services.length,
    data: {
      services
    }
  });
});

//GET /api/services/categories
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

//GET /api/services/search
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

//GET /api/services/stats
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