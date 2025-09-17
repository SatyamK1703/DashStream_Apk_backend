import Service from "../models/serviceModel.js";
import { asyncHandler, AppError } from "../middleware/errorMiddleware.js";
import { cacheInvalidate } from "../middleware/cache.js";
import { CACHE_TTL } from "../config/cache.js";

//GET /api/services/categories/:category
export const getServicesByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;

  // Validate category
  const validCategories = [
    "car wash",
    "bike wash",
    "detailing",
    "maintenance",
    "customization",
    "other",
  ];
  if (!validCategories.includes(category)) {
    return next(new AppError("Invalid category", 400));
  }

  const services = await Service.find({
    category,
    isActive: true,
  })
  .sort({ rating: -1, popularity: -1 });

  res.status(200).json({
    status: "success",
    results: services.length,
    services,
  });
});

//GET /api/services
export const getAllServices = asyncHandler(async (req, res, next) => {
  // Build base filter
  const filter = {};

  // Active filter (default true)
  if (req.query.showInactive !== "true") {
    filter.isActive = true;
  }

  // Category filter
  if (req.query.category) {
    filter.category = req.query.category;
  }

  // Vehicle type filter
  if (req.query.vehicleType) {
    filter.vehicleType = req.query.vehicleType;
  }

  // Price range filter
  if (req.query.minPrice && req.query.maxPrice) {
    filter.price = {
      $gte: parseInt(req.query.minPrice),
      $lte: parseInt(req.query.maxPrice),
    };
  } else if (req.query.minPrice) {
    filter.price = { $gte: parseInt(req.query.minPrice) };
  } else if (req.query.maxPrice) {
    filter.price = { $lte: parseInt(req.query.maxPrice) };
  }

  // Search filter
  if (req.query.search) {
    const regex = new RegExp(req.query.search, "i");
    filter.$or = [
      { title: { $regex: regex } },
      { description: { $regex: regex } },
      { tags: { $in: [regex] } },
    ];
  }

  // Popular filter
  if (req.query.popular === "true") {
    filter.isPopular = true;
  }

  // Sort
  const sort = req.query.sort
    ? req.query.sort.split(",").join(" ")
    : "-createdAt";

  // Pagination with caps
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  // Generate cache key based on filters
  const cacheKey = `services_list:${JSON.stringify({
    filter,
    sort,
    page,
    limit,
  })}`;

  // Get services with pagination
  const services = await Service.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Get total count for pagination info  
  const totalServices = await Service.countDocuments(filter);
  const totalPages = Math.ceil(totalServices / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const nextPage = hasNextPage ? page + 1 : null;
  const prevPage = hasPrevPage ? page - 1 : null;

  res.status(200).json({
    status: "success",
    results: services.length,
    totalCount: totalServices,
    currentPage: page,
    totalPages: totalPages,
    hasNextPage: hasNextPage,
    hasPrevPage: hasPrevPage,
    nextPage: nextPage,
    prevPage: prevPage,
    services: services,
  });
});

//GET /api/services/:id
export const getService = asyncHandler(async (req, res, next) => {
  // Get service by ID
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError("No service found with that ID", 404));
  }

  // Get related services  
  const relatedServices = await Service.find({
    category: service.category,
    _id: { $ne: service._id },
    isActive: true,
  })
  .limit(4)
  .sort({ rating: -1 });

  res.status(200).json({
    status: "success",
    service,
    relatedServices,
  });
});

//POST /api/services
export const createService = asyncHandler(async (req, res, next) => {
  // Add creator if not provided
  if (!req.body.creator) {
    req.body.creator = req.user.id;
  }

  const newService = await Service.create(req.body);

  // Invalidate caches related to services lists and categories
  cacheInvalidate("/api/services");

  res.status(201).json({
    status: "success",
    data: {
      service: newService,
    },
  });
});

//PATCH /api/services/:id
export const updateService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id).lean();

  if (!service) {
    return next(new AppError("No service found with that ID", 404));
  }

  // Check if user is authorized to update this service
  if (req.user.role !== "admin" && service.creator.toString() !== req.user.id) {
    return next(
      new AppError("You are not authorized to update this service", 403)
    );
  }

  const updatedService = await Service.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  // Invalidate caches related to services
  cacheInvalidate("/api/services");

  res.status(200).json({
    status: "success",
    data: {
      service: updatedService,
    },
  });
});

//DELETE /api/services/:id
export const deleteService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id).lean();

  if (!service) {
    return next(new AppError("No service found with that ID", 404));
  }

  // Check if user is authorized to delete this service
  if (req.user.role !== "admin" && service.creator.toString() !== req.user.id) {
    return next(
      new AppError("You are not authorized to delete this service", 403)
    );
  }

  await Service.findByIdAndDelete(req.params.id);

  // Invalidate caches related to services
  cacheInvalidate("/api/services");

  res.status(204).json({
    status: "success",
    data: null,
  });
});

//GET /api/services/top-services
export const getTopServices = asyncHandler(async (req, res, next) => {
  const services = await Service.find({ isActive: true })
    .sort("-popularity -rating")
    .limit(5)
    .lean();

  res.status(200).json({
    status: "success",
    results: services.length,
    data: {
      services,
    },
  });
});

//GET /api/services/categories/:category
export const getServicesByCategoryId = asyncHandler(async (req, res, next) => {
  const services = await Service.find({ category: req.params.category });

  res.status(200).json({
    status: "success",
    results: services.length,
    data: {
      services,
    },
  });
});

//GET /api/services/categories
export const getServiceCategories = asyncHandler(async (req, res, next) => {
  const categories = await Service.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        // use title instead of name (model uses title)
        services: { $push: { id: "$_id", title: "$title", price: "$price" } },
      },
    },
    {
      $project: {
        category: "$_id",
        count: 1,
        services: { $slice: ["$services", 5] },
        _id: 0,
      },
    },
  ]).allowDiskUse(true);

  res.status(200).json({
    status: "success",
    results: categories.length,
    data: {
      categories,
    },
  });
});

//GET /api/services/search
export const searchServices = asyncHandler(async (req, res, next) => {
  if (!req.query.q) {
    return next(new AppError("Please provide a search query", 400));
  }

  const searchQuery = req.query.q;
  const regex = new RegExp(searchQuery, "i");

  const services = await Service.find({
    $or: [
      { title: { $regex: regex } },
      { description: { $regex: regex } },
      { category: { $regex: regex } },
      { tags: { $regex: regex } },
    ],
    isActive: true,
  })
    .limit(Math.min(20, parseInt(req.query.limit) || 10))
    .lean();

  res.status(200).json({
    status: "success",
    results: services.length,
    data: {
      services,
    },
  });
});

//GET /api/services/stats
export const getServiceStats = asyncHandler(async (req, res, next) => {
  const stats = await Service.aggregate([
    {
      $group: {
        _id: "$category",
        numServices: { $sum: 1 },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
        avgRating: { $avg: "$rating" },
      },
    },
    {
      $sort: { numServices: -1 },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

export const getPopularServices = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 6;

  const services = await Service.find({
    isActive: true,
    isPopular: true,
  }).limit(limit);

  res.status(200).json({
    status: "success",
    results: services.length,
    services,
  });
});
