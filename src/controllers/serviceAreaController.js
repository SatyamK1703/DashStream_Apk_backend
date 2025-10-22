import ServiceArea from '../models/serviceAreaModel.js';
import catchAsync from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';

export const getAllServiceAreas = catchAsync(async (req, res, next) => {
  const serviceAreas = await ServiceArea.find();
  res.status(200).json({
    status: 'success',
    results: serviceAreas.length,
    data: {
      serviceAreas,
    },
  });
});

export const createServiceArea = catchAsync(async (req, res, next) => {
  const { pincode, name } = req.body;
  if (!pincode || !name) {
    return next(new AppError('Pincode and name are required', 400));
  }
  const newServiceArea = await ServiceArea.create({ pincode, name });
  res.status(201).json({
    status: 'success',
    data: {
      serviceArea: newServiceArea,
    },
  });
});

export const deleteServiceArea = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const serviceArea = await ServiceArea.findByIdAndDelete(id);
  if (!serviceArea) {
    return next(new AppError('No service area found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const checkServiceAvailability = catchAsync(async (req, res, next) => {
    const { pincode } = req.query;
    if (!pincode) {
        return next(new AppError('Pincode is required to check service availability.', 400));
    }

    const serviceArea = await ServiceArea.findOne({ pincode, isActive: true });

    if (!serviceArea) {
        return res.status(200).json({
            status: 'success',
            isAvailable: false,
            message: 'Service not available for your area',
        });
    }

    res.status(200).json({
        status: 'success',
        isAvailable: true,
        message: 'Service is available in your area',
    });
});
