import User from "../models/userModel.js";
import { asyncHandler } from "../middleware/errorMiddleware.js";
import { AppError } from "../utils/appError.js";
import { cloudinary, upload } from "../utils/cloudinary.js";
import { cache, CACHE_TTL, CACHE_KEYS } from "../config/cache.js";

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//POST /api/users
export const createUser = asyncHandler(async (req, res, next) => {
  const newUser = await User.create(req.body);

  res.sendSuccess({ user: newUser }, "User created successfully", 201);
});

//PATCH /api/users/:id
export const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

//PATCH /api/users/update-profile
export const updateProfile = asyncHandler(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    "name",
    "email",
    "vehicle",
    "profileImage"
  );
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.sendSuccess({ user: updatedUser }, "Profile updated successfully");
});

// Middleware for uploading profile image
export const uploadProfileImage = upload.single("profileImage");

// Update user profile image
export const updateProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Please upload an image", 400));
  }

  try {
    // Get user with only profileImage field selected
    const user = await User.findById(req.user.id).select("profileImage");

    if (user.profileImage && user.profileImage.public_id) {
      await cloudinary.uploader.destroy(user.profileImage.public_id);
    }
    user.profileImage = {
      public_id: req.file.filename,
      url: req.file.path,
    };

    await user.save();

    res.sendSuccess({ user }, "Profile image updated successfully");
  } catch (error) {
    console.error("Error updating profile image:", error);
    return next(
      new AppError("Failed to update profile image. Please try again.", 500)
    );
  }
});

//DELETE /api/users/:id
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

//GET /api/users
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, role, status } = req.query;

  // Build filter
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get users with pagination
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination info
  const totalUsers = await User.countDocuments(filter);
  const totalPages = Math.ceil(totalUsers / limitNum);

  res.sendPaginated(users, pageNum, limitNum, totalUsers, "Users retrieved successfully");
});

// User is authenticated - fetch and return user data
// GET /api/users/me - Get current user (guest-friendly)
export const getCurrentUser = asyncHandler(async (req, res, next) => {
  // If no authenticated user (optionalAuth), return guest response
  if (!req.user) {
    return res.sendSuccess({
      user: null,
      isAuthenticated: false,
      isGuest: true,
    }, "No user is currently logged in");
  }

  // Use the user from middleware (already fetched) to avoid extra DB call
  const user = req.user;

  // Format user data for React Native app
  const userData = {
    id: user._id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage?.url || "",
    profileComplete: user.profileComplete || false,
    isPhoneVerified: user.isPhoneVerified || false,
    active: user.active !== false,
    lastActive: user.lastActive,
  };

  return res.sendSuccess({
    user: userData,
    isAuthenticated: true,
    isGuest: false,
  }, "Current user data retrieved successfully");
});

//GET /api/users/:id
export const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.sendSuccess({ user }, "User retrieved successfully");
});

//DELETE /api/users/delete-account
export const deleteAccount = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// GET /api/users/professionals
export const getProfessionals = asyncHandler(async (req, res, next) => {
  const { rating, availability, page = 1, limit = 10 } = req.query;

  // Build filter for professionals
  const filter = {
    role: "professional",
    profileComplete: true,
    active: true,
  };

  if (rating) {
    filter.totalRatings = { $gte: parseFloat(rating) };
  }

  if (availability === "true") {
    filter.isAvailable = true;
    filter.status = "available";
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get professionals with pagination
  const professionals = await User.find(filter)
    .sort({ totalRatings: -1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination info
  const totalProfessionals = await User.countDocuments(filter);
  const totalPages = Math.ceil(totalProfessionals / limitNum);
  const hasNext = pageNum < totalPages;
  const hasPrev = pageNum > 1;

  res.status(200).json({
    status: "success",
    results: totalProfessionals,
    page: pageNum,
    totalPages: totalPages,
    data: {
      professionals: professionals,
      pagination: {
        hasNext: hasNext,
        hasPrev: hasPrev,
      },
    },
  });
});

// GET /api/users/professionals/:id
export const getProfessionalDetails = asyncHandler(async (req, res, next) => {
  const professional = await User.findOne({
    _id: req.params.id,
    role: "professional",
  });

  if (!professional) {
    return next(new AppError("No professional found with that ID", 404));
  }

  res.sendSuccess({ professional }, "Professional details retrieved successfully");
});

// PATCH /api/users/professional-profile
export const updateProfessionalProfile = asyncHandler(
  async (req, res, next) => {
    if (req.user.role !== "professional") {
      return next(
        new AppError("Only professionals can update professional profiles", 403)
      );
    }

    // Only allow safe fields for now
    const allowedUpdates = ["isAvailable", "status", "profileImage", "phone"];
    const updates = {};
    for (let field of allowedUpdates) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    res.sendSuccess({ user: updatedUser }, "Professional profile updated successfully");
  }
);

// PATCH /api/users/toggle-availability
export const toggleAvailability = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "professional" && req.user.role !== "admin") {
    return next(
      new AppError("Only professionals can update availability", 403)
    );
  }

  const user = await User.findById(req.user.id);
  user.isAvailable = !user.isAvailable;
  await user.save({ validateBeforeSave: false });

  res.sendSuccess({ isAvailable: user.isAvailable }, "Availability updated successfully");
});

// GET /api/users/stats
export const getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        avgRating: { $avg: { $avg: "$reviews.rating" } }, // average of embedded ratings
      },
    },
  ]);

  res.sendSuccess({ stats }, "User stats retrieved successfully");
});
