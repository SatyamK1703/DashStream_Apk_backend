import User from '../models/userModel.js';
import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
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
  const { serviceType, location, rating, availability } = req.query;
  
  // Build query
  const query = { role: 'professional', profileComplete: true };
  
  // Add filters if provided
  if (serviceType) query['services.type'] = serviceType;
  if (location) query.location = { $regex: location, $options: 'i' };
  if (rating) query.rating = { $gte: parseFloat(rating) };
  if (availability === 'true') query.isAvailable = true;
  
  const professionals = await User.find(query).select('-password');
  
  res.status(200).json({
    status: 'success',
    results: professionals.length,
    data: {
      professionals
    }
  });
});

//GET /api/users/professionals/:id
export const getProfessionalDetails = asyncHandler(async (req, res, next) => {
  const professional = await User.findOne({
    _id: req.params.id,
    role: 'professional'
  }).populate('reviews');

  if (!professional) {
    return next(new AppError('No professional found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      professional
    }
  });
});

//PATCH /api/users/professional-profile
export const updateProfessionalProfile = asyncHandler(async (req, res, next) => {
  // Check if user is a professional
  if (req.user.role !== 'professional') {
    return next(new AppError('Only professionals can update professional profiles', 403));
  }

  const {
    bio,
    experience,
    services,
    availability,
    workingHours,
    isAvailable
  } = req.body;

  // Update professional-specific fields
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      bio,
      experience,
      services,
      availability,
      workingHours,
      isAvailable
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

//PATCH /api/users/toggle-availability
export const toggleAvailability = asyncHandler(async (req, res, next) => {
  // Check if user is a professional
  if (req.user.role !== 'professional') {
    return next(new AppError('Only professionals can update availability', 403));
  }

  const user = await User.findById(req.user.id);
  user.isAvailable = !user.isAvailable;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      isAvailable: user.isAvailable
    }
  });
});

//GET /api/users/stats
export const getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});


//POST /api/v1/addresses
export const createAddress = asyncHandler(async (req, res, next) => {
  // 1) Add the current user's ID to the request body to link the address
  req.body.customer = req.user.id;

  // 2) Create the new address document
  const newAddress = await Address.create(req.body);

  // 3) Add the new address's ID to the user's `addresses` array
  await User.findByIdAndUpdate(req.user.id, {
    $push: { addresses: newAddress._id },
  });

  res.status(201).json({
    status: 'success',
    data: {
      address: newAddress,
    },
  });
});
//GET /api/v1/addresses
export const getMyAddresses = asyncHandler(async (req, res, next) => {
  // Find all addresses that belong to the current user
  const addresses = await Address.find({ customer: req.user.id });

  res.status(200).json({
    status: 'success',
    results: addresses.length,
    data: {
      addresses,
    },
  });
});

//PATCH /api/v1/addresses/:id
export const updateAddress = asyncHandler(async (req, res, next) => {
  // Find the address by its ID AND ensure it belongs to the logged-in user
  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, customer: req.user.id },
    req.body,
    {
      new: true, // Return the updated document
      runValidators: true,
    }
  );

  if (!address) {
    return next(new AppError('No address found with that ID for this user.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      address,
    },
  });
});

//DELETE /api/v1/addresses/:id
export const deleteAddress = asyncHandler(async (req, res, next) => {
  // 1) Find the address by ID AND ensure it belongs to the current user before deleting
  const address = await Address.findOneAndDelete({
    _id: req.params.id,
    customer: req.user.id,
  });

  if (!address) {
    return next(new AppError('No address found with that ID for this user.', 404));
  }

  // 2) Remove the address reference from the user's `addresses` array
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { addresses: address._id },
  });

  // Use 204 No Content for successful deletions
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

//PATCH /api/v1/addresses/:id/set-default
export const setDefaultAddress = asyncHandler(async (req, res, next) => {
    const addressId = req.params.id;
    const userId = req.user.id;

    // 1) Security Check: Ensure the address belongs to the user
    const address = await Address.findOne({ _id: addressId, customer: userId });
    if (!address) {
        return next(new AppError('Address not found or does not belong to you.', 404));
    }

    // 2) Set all of the user's addresses to `isDefault: false`
    await Address.updateMany({ customer: userId }, { isDefault: false });

    // 3) Set the chosen address to `isDefault: true`
    const defaultAddress = await Address.findByIdAndUpdate(addressId, { isDefault: true }, { new: true });

    res.status(200).json({
        status: 'success',
        message: 'Default address has been updated.',
        data: {
            address: defaultAddress,
        }
    });
});