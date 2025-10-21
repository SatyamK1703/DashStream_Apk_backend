const ServiceArea = require('../models/serviceAreaModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllServiceAreas = catchAsync(async (req, res, next) => {
  const serviceAreas = await ServiceArea.find();
  res.status(200).json({
    status: 'success',
    results: serviceAreas.length,
    data: {
      serviceAreas,
    },
  });
});

exports.createServiceArea = catchAsync(async (req, res, next) => {
  const { pincode } = req.body;
  if (!pincode) {
    return next(new AppError('Pincode is required', 400));
  }
  const newServiceArea = await ServiceArea.create({ pincode });
  res.status(201).json({
    status: 'success',
    data: {
      serviceArea: newServiceArea,
    },
  });
});

exports.deleteServiceArea = catchAsync(async (req, res, next) => {
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

exports.checkServiceAvailability = catchAsync(async (req, res, next) => {
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
