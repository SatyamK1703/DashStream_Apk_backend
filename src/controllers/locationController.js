
import { AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getReverseGeocode } from '../services/locationService.js';

export const reverseGeocode = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    throw new AppError('Latitude and longitude are required', 400);
  }

  const address = await getReverseGeocode(latitude, longitude);

  res.success({
    data: address,
    message: 'Reverse geocode successful',
  });
});
