
import { asyncHandler } from '../middleware/errorMiddleware.js';
import AppError from '../utils/appError.js';
import DeviceToken from '../models/deviceTokenModel.js';

//POST /api/notifications/register-device
export const registerDeviceToken = asyncHandler(async (req, res, next) => {
  const { token, deviceType, deviceInfo } = req.body;

  if (!token) {
    return next(new AppError('Device token is required', 400));
  }

  if (!['ios', 'android', 'web'].includes(deviceType)) {
    return next(new AppError('Invalid device type', 400));
  }

  const deviceToken = await DeviceToken.registerToken(req.user.id, {
    token,
    deviceType,
    deviceInfo: deviceInfo || {}
  });

  res.sendSuccess(
    { deviceToken },
    'Device registered successfully for push notifications'
  );
});

//DELETE /api/notifications/deregister-device
export const deregisterDeviceToken = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Device token is required', 400));
  }

  // Find the token first to verify ownership
  const existingToken = await DeviceToken.findOne({ token });

  if (!existingToken) {
    return next(new AppError('Device token not found', 404));
  }

  // Verify the token belongs to the current user
  if (existingToken.user.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to deregister this device', 403));
  }

  await DeviceToken.deactivateToken(token);

  res.sendSuccess(
    null,
    'Device deregistered successfully'
  );
});

//GET /api/notifications/my-devices
export const getMyDevices = asyncHandler(async (req, res, next) => {
  const devices = await DeviceToken.find({
    user: req.user.id,
    isActive: true
  });

  res.sendSuccess(
    { devices },
    'Devices retrieved successfully'
  );
});

//DELETE /api/notifications/cleanup-tokens
export const cleanupOldTokens = asyncHandler(async (req, res, next) => {
  // Only admins can perform this action
  if (req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const { days } = req.query;
  const daysOld = parseInt(days) || 90; // Default to 90 days

  const result = await DeviceToken.cleanupOldTokens(daysOld);

  res.sendSuccess(
    { deletedCount: result.deletedCount },
    `${result.deletedCount} old device tokens cleaned up`
  );
});