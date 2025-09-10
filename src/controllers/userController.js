import User from '../models/userModel.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import AppError from '../utils/appError.js';
import { cloudinary, upload } from '../utils/cloudinary.js';
import Address from '../models/addressModel.js';


const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//POST /api/users
export const createUser = asyncHandler(async (req, res, next) => {
  const newUser = await User.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      user: newUser
    }
  });
});

//PATCH /api/users/:id
export const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

//PATCH /api/users/update-profile
export const updateProfile = asyncHandler(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    'name',
    'email',
    'vehicle',
    'profileImage'
  );
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// Middleware for uploading profile image
export const uploadProfileImage = upload.single('profileImage');

// Update user profile image
export const updateProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  try {
    const user = await User.findById(req.user.id);
    if (user.profileImage && user.profileImage.public_id) {
      await deleteImage(user.profileImage.public_id);
    }
    user.profileImage = {
      public_id: req.file.filename,
      url: req.file.path
    };

    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Error updating profile image:', error);
    return next(new AppError('Failed to update profile image. Please try again.', 500));
  }
});

//DELETE /api/users/:id
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// POST /api/v1/addresses
export const createAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));

  const { name, address, city, pincode, isDefault } = req.body;

  // If new address is default, reset old defaults
  if (isDefault) {
    user.addresses.forEach(addr => (addr.isDefault = false));
  }

  user.addresses.push({ name, address, city, pincode, isDefault });

  await user.save();

  res.status(201).json({
    status: "success",
    data: { addresses: user.addresses },
  });
});

// GET /api/v1/addresses
export const getMyAddresses = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("addresses");
  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({
    status: "success",
    results: user.addresses.length,
    data: { addresses: user.addresses },
  });
});

// PATCH /api/v1/addresses/:addressId
export const updateAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));

  const address = user.addresses.id(req.params.addressId);
  if (!address) return next(new AppError("Address not found", 404));

  const { name, address: addrLine, city, pincode, isDefault } = req.body;

  if (isDefault) {
    user.addresses.forEach(addr => (addr.isDefault = false));
  }

  address.name = name ?? address.name;
  address.address = addrLine ?? address.address;
  address.city = city ?? address.city;
  address.pincode = pincode ?? address.pincode;
  address.isDefault = isDefault ?? address.isDefault;

  await user.save();

  res.status(200).json({
    status: "success",
    data: { address },
  });
});

// DELETE /api/v1/addresses/:addressId
export const deleteAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));

  const address = user.addresses.id(req.params.addressId);
  if (!address) return next(new AppError("Address not found", 404));

  address.remove();
  await user.save();

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// PATCH /api/v1/addresses/:addressId/set-default
export const setDefaultAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));

  const address = user.addresses.id(req.params.addressId);
  if (!address) return next(new AppError("Address not found", 404));
  user.addresses.forEach(addr => (addr.isDefault = false));

  address.isDefault = true;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Default address updated",
    data: { addresses: user.addresses },
  });
});

//GET /api/users
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

// GET /api/users/me - Get current user (supports both authenticated and guest users)
export const getCurrentUser = asyncHandler(async (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    // User is not logged in - return guest status
    return res.status(200).json({
      status: 'success',
      message: 'No user is currently logged in',
      data: {
        user: null,
        isAuthenticated: false,
        isGuest: true
      }
    });
  }

  // User is authenticated - fetch and return user data
  const user = await User.findById(req.user.id).select('-otp -otpExpires');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Format user data for React Native app
  const userData = {
    id: user._id,
    name: user.name || '',
    email: user.email || '',
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage?.url || '',
    profileComplete: user.profileComplete || false,
    isPhoneVerified: user.isPhoneVerified || false,
    active: user.active !== false,
    lastActive: user.lastActive
  };

  res.status(200).json({
    status: 'success',
    message: 'Current user data retrieved successfully',
    data: {
      user: userData,
      isAuthenticated: true,
      isGuest: false
    }
  });
});

//GET /api/users/:id
export const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

//DELETE /api/users/delete-account
export const deleteAccount = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// GET /api/users/professionals
export const getProfessionals = asyncHandler(async (req, res, next) => {
  const { rating, availability } = req.query;

  const query = { role: 'professional', profileComplete: true };
  const professionals = await User.find(query)

  res.status(200).json({
    status: 'success',
    results: professionals.length,
    data: { professionals }
  });
});

// GET /api/users/professionals/:id
export const getProfessionalDetails = asyncHandler(async (req, res, next) => {
  const professional = await User.findOne({
    _id: req.params.id,
    role: 'professional'
  });

  if (!professional) {
    return next(new AppError('No professional found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { professional }
  });
});

// PATCH /api/users/professional-profile
export const updateProfessionalProfile = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'professional') {
    return next(new AppError('Only professionals can update professional profiles', 403));
  }

  // Only allow safe fields for now
  const allowedUpdates = ['isAvailable', 'status', 'profileImage','phone'];
  const updates = {};
  for (let field of allowedUpdates) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

// PATCH /api/users/toggle-availability
export const toggleAvailability = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'professional' && req.user.role !== 'admin') {
    return next(new AppError('Only professionals can update availability', 403));
  }

  const user = await User.findById(req.user.id);
  user.isAvailable = !user.isAvailable;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { isAvailable: user.isAvailable }
  });
});

// GET /api/users/stats
export const getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        avgRating: { $avg: { $avg: '$reviews.rating' } } // average of embedded ratings
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

