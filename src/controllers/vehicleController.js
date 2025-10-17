import Vehicle from '../models/vehicleModel.js';
import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import { cloudinary } from '../utils/cloudinary.js';

// GET /api/vehicles - Get user's vehicles
export const getMyVehicles = asyncHandler(async (req, res, next) => {
  const vehicles = await Vehicle.getUserVehicles(req.user.id);

  res.status(200).json({
    status: 'success',
    results: vehicles.length,
    data: {
      vehicles
    }
  });
});

// GET /api/vehicles/default - Get user's default vehicle
export const getMyDefaultVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.getUserDefaultVehicle(req.user.id);

  if (!vehicle) {
    return next(new AppError('No default vehicle found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      vehicle
    }
  });
});

// GET /api/vehicles/:id - Get specific vehicle
export const getVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      vehicle
    }
  });
});

// POST /api/vehicles - Create new vehicle
export const createVehicle = asyncHandler(async (req, res, next) => {
  req.body.user = req.user.id;
  if (req.body.isDefault) {
    await Vehicle.updateMany(
      { user: req.user.id },
      { isDefault: false }
    );
  }

  const vehicle = await Vehicle.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      vehicle
    }
  });
});

// PATCH /api/vehicles/:id - Update vehicle
export const updateVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  // If setting as default, ensure no other vehicle is default
  if (req.body.isDefault) {
    await Vehicle.updateMany(
      { user: req.user.id, _id: { $ne: req.params.id } },
      { isDefault: false }
    );
  }

  const updatedVehicle = await Vehicle.findByIdAndUpdate(
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
      vehicle: updatedVehicle
    }
  });
});

export const deleteVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  vehicle.isActive = false;
  await vehicle.save();

  if (vehicle.isDefault) {
    const nextVehicle = await Vehicle.findOne({
      user: req.user.id,
      _id: { $ne: req.params.id }
    });

    if (nextVehicle) {
      nextVehicle.isDefault = true;
      await nextVehicle.save();
    }
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// PATCH /api/vehicles/:id/set-default - Set vehicle as default
export const setDefaultVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  await vehicle.setAsDefault();

  res.status(200).json({
    status: 'success',
    data: {
      vehicle
    }
  });
});

// POST /api/vehicles/:id/upload-image - Upload vehicle image
export const uploadVehicleImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  try {
    // Delete old image if exists
    if (vehicle.image && vehicle.image.public_id) {
      await cloudinary.uploader.destroy(vehicle.image.public_id);
    }

    // Update vehicle with new image
    vehicle.image = {
      public_id: req.file.filename,
      url: req.file.path
    };

    await vehicle.save();

    res.status(200).json({
      status: 'success',
      data: {
        vehicle
      }
    });
  } catch (error) {
    console.error('Error uploading vehicle image:', error);
    return next(new AppError('Failed to upload image. Please try again.', 500));
  }
});


