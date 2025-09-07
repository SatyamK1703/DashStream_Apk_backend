import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { checkRole } from '../middleware/roleMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { locationSchemas } from '../schemas/validationSchemas.js';
import {
  updateProfessionalLocation,
  updateProfessionalStatus,
  setTrackingEnabled,
  updateTrackingSettings,
  getProfessionalLocation,
  getProfessionalLocationHistory,
  findNearbyProfessionals,
  subscribeToLocationUpdates,
  unsubscribeFromLocationUpdates
} from '../services/locationService.js';
import * as firebaseController from '../controllers/firebaseController.js';

const router = express.Router();

//POST /api/location/update

router.post('/update', authenticate, checkRole('professional'), validateBody(locationSchemas.updateLocation), async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, heading, batteryLevel, networkType } = req.body;
    
    // Update location
    const location = await updateProfessionalLocation(req.user.id, {
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      batteryLevel,
      networkType
    });
    
    res.success({
      data: location,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error in location update route:', error);
    res.error({
      message: error.message || 'An error occurred while updating location',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//POST /api/location/status

router.post('/status', authenticate, checkRole('professional'), validateBody(locationSchemas.updateStatus), async (req, res) => {
  try {
    const { status } = req.body;
    
    // Update status
    const location = await updateProfessionalStatus(req.user.id, status);
    
    res.success({
      data: location,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Error in status update route:', error);
    res.error({
      message: error.message || 'An error occurred while updating status',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

router.post('/tracking', authenticate, checkRole('professional'), validateBody(locationSchemas.setTrackingEnabled), async (req, res) => {
  try {
    const { enabled } = req.body;
    
    // Update tracking status
    const location = await setTrackingEnabled(req.user.id, enabled);
    
    res.success({
      data: location,
      message: `Location tracking ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error in tracking update route:', error);
    res.error({
      message: error.message || 'An error occurred while updating tracking status',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//POST /api/location/settings

router.post('/settings', authenticate, checkRole('professional'), validateBody(locationSchemas.updateTrackingSettings), async (req, res) => {
  try {
    const { updateInterval, significantChangeThreshold, batteryOptimizationEnabled, maxHistoryItems } = req.body;
    
    // Update settings
    const location = await updateTrackingSettings(req.user.id, {
      updateInterval,
      significantChangeThreshold,
      batteryOptimizationEnabled,
      maxHistoryItems
    });
    
    res.success({
      data: location,
      message: 'Tracking settings updated successfully'
    });
  } catch (error) {
    console.error('Error in settings update route:', error);
    res.error({
      message: error.message || 'An error occurred while updating settings',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//GET /api/location/professional/:id

router.get('/professional/:id', authenticate, async (req, res) => {
  try {
    const professionalId = req.params.id;
    
    // Get location
    const location = await getProfessionalLocation(professionalId);
    
    res.success({
      data: location,
      message: 'Professional location retrieved successfully'
    });
  } catch (error) {
    console.error('Error in get location route:', error);
    res.error({
      message: error.message || 'An error occurred while getting location',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//GET /api/location/professional/:id/history

router.get('/professional/:id/history', authenticate, async (req, res) => {
  try {
    const professionalId = req.params.id;
    const limit = parseInt(req.query.limit) || 50;
    
    // Get location history
    const history = await getProfessionalLocationHistory(professionalId, limit);
    
    res.success({
      data: history,
      message: 'Location history retrieved successfully'
    });
  } catch (error) {
    console.error('Error in get location history route:', error);
    res.error({
      message: error.message || 'An error occurred while getting location history',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//GET /api/location/nearby

router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance, status } = req.query;
    
    // Validate required fields
    if (!latitude || !longitude) {
      return res.validationFail({ message: 'Latitude and longitude are required', errors: { latitude: 'Required', longitude: 'Required' } });
    }
    
    // Validate coordinate format
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.validationFail({ message: 'Invalid coordinates provided', errors: { coordinates: 'Invalid format' } });
    }
    
    // Parse maxDistance with a reasonable default and limit
    let distance = maxDistance ? parseInt(maxDistance) : 10000; // Default 10km
    distance = Math.min(distance, 50000); // Cap at 50km
    
    // Find nearby professionals
    const professionals = await findNearbyProfessionals(
      { latitude: lat, longitude: lng },
      distance,
      status || 'available'
    );
    
    res.success({
      data: professionals,
      message: 'Nearby professionals retrieved successfully',
      meta: { distance: distance }
    });
  } catch (error) {
    console.error('Error in nearby professionals route:', error);
    res.error({
      message: error.message || 'An error occurred while finding nearby professionals',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//POST /api/location/subscribe/:professionalId

router.post('/subscribe/:professionalId', authenticate, async (req, res) => {
  try {
    const professionalId = req.params.professionalId;
    
    // Subscribe to updates
    const result = await subscribeToLocationUpdates(req.user.id, professionalId);
    
    res.success({
      data: result,
      message: 'Successfully subscribed to location updates'
    });
  } catch (error) {
    console.error('Error in subscribe route:', error);
    res.error({
      message: error.message || 'An error occurred while subscribing to location updates',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//POST /api/location/unsubscribe/:professionalId

router.post('/unsubscribe/:professionalId', authenticate, async (req, res) => {
  try {
    const professionalId = req.params.professionalId;
    
    // Unsubscribe from updates
    const result = await unsubscribeFromLocationUpdates(req.user.id, professionalId);
    
    res.success({
      data: result,
      message: 'Successfully unsubscribed from location updates'
    });
  } catch (error) {
    console.error('Error in unsubscribe route:', error);
    res.error({
      message: error.message || 'An error occurred while unsubscribing from location updates',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//POST /api/location/notifications/send

router.post('/notifications/send', authenticate, async (req, res, next) => {
  try {
    await firebaseController.sendNotification(req, res, next);
  } catch (error) {
    console.error('Error in send notification route:', error);
    res.error({
      message: error.message || 'An error occurred while sending notification',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

//POST /api/location/notifications/send-multicast

router.post('/notifications/send-multicast', authenticate, async (req, res, next) => {
  try {
    await firebaseController.sendMulticastNotification(req, res, next);
  } catch (error) {
    console.error('Error in send multicast notification route:', error);
    res.error({
      message: error.message || 'An error occurred while sending multicast notification',
      errorCode: error.errorCode,
      statusCode: error.statusCode || 500
    });
  }
});

export default router;