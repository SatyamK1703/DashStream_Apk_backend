import Address from '../models/addressModel.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { AppError } from '../utils/appError.js';

// @desc    Create a new address
// @route   POST /api/addresses
// @access  Private
export const createAddress = asyncHandler(async (req, res, next) => {
  try {
    console.log('Creating address with data:', req.body);
    req.body.user = req.user.id;

    // Ensure isDefault is handled properly
    if (req.body.isDefault) {
      // First, set all other addresses for this user to not default
      await Address.updateMany({ user: req.user.id }, { isDefault: false });
    }

    const address = await Address.create(req.body);
    console.log('Address created successfully:', address);
    res.status(201).json({
      status: 'success',
      data: { address },
    });
  } catch (error) {
    console.error('Address creation error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    return next(new AppError(`Failed to create address: ${error.message}`, 500));
  }
});

// @desc    Get all addresses for a user
// @route   GET /api/addresses
// @access  Private
export const getMyAddresses = asyncHandler(async (req, res, next) => {
  const addresses = await Address.find({ user: req.user.id });
  res.status(200).json({
    status: 'success',
    results: addresses.length,
    data: { addresses },
  });
});

// @desc    Get an address by ID
// @route   GET /api/addresses/:id
// @access  Private
export const getAddress = asyncHandler(async (req, res, next) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user.id });
  if (!address) {
    return next(new AppError('Address not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { address },
  });
});

// @desc    Update an address
// @route   PATCH /api/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req, res, next) => {
  const address = await Address.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, {
    new: true,
    runValidators: true,
  });

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { address },
  });
});

// @desc    Delete an address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req, res, next) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.id });

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Set an address as default
// @route   PATCH /api/addresses/:id/set-default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req, res, next) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user.id });

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  address.isDefault = true;
  await address.save();

  res.status(200).json({
    status: 'success',
    message: 'Default address updated',
    data: { address },
  });
});
