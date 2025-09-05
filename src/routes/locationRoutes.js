import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { checkRole } from '../middleware/roleMiddleware.js';
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

const router = express.Router();

/**
 * @route POST /api/location/update
 * @desc Update a professional's location
 * @access Private (Professional only)
 */
router.post('/update', authenticate, checkRole('professional'), async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, heading } = req.body;
    
    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }
    
    // Update location
    const location = await updateProfessionalLocation(req.user.id, {
      latitude,
      longitude,
      accuracy,
      speed,
      heading
    });
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error in location update route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while updating location'
    });
  }
});

/**
 * @route POST /api/location/status
 * @desc Update a professional's status
 * @access Private (Professional only)
 */
router.post('/status', authenticate, checkRole('professional'), async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate required fields
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    
    // Update status
    const location = await updateProfessionalStatus(req.user.id, status);
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error in status update route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while updating status'
    });
  }
});

/**
 * @route POST /api/location/tracking
 * @desc Enable or disable location tracking
 * @access Private (Professional only)
 */
router.post('/tracking', authenticate, checkRole('professional'), async (req, res) => {
  try {
    const { enabled } = req.body;
    
    // Validate required fields
    if (enabled === undefined) {
      return res.status(400).json({ success: false, message: 'Enabled flag is required' });
    }
    
    // Update tracking status
    const location = await setTrackingEnabled(req.user.id, enabled);
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error in tracking update route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while updating tracking status'
    });
  }
});

/**
 * @route POST /api/location/settings
 * @desc Update tracking settings
 * @access Private (Professional only)
 */
router.post('/settings', authenticate, checkRole('professional'), async (req, res) => {
  try {
    const { updateInterval, significantChangeThreshold, batteryOptimizationEnabled, maxHistoryItems } = req.body;
    
    // Update settings
    const location = await updateTrackingSettings(req.user.id, {
      updateInterval,
      significantChangeThreshold,
      batteryOptimizationEnabled,
      maxHistoryItems
    });
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error in settings update route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while updating settings'
    });
  }
});

/**
 * @route GET /api/location/professional/:id
 * @desc Get a professional's current location
 * @access Private
 */
router.get('/professional/:id', authenticate, async (req, res) => {
  try {
    const professionalId = req.params.id;
    
    // Get location
    const location = await getProfessionalLocation(professionalId);
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error in get location route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while getting location'
    });
  }
});

/**
 * @route GET /api/location/professional/:id/history
 * @desc Get a professional's location history
 * @access Private
 */
router.get('/professional/:id/history', authenticate, async (req, res) => {
  try {
    const professionalId = req.params.id;
    const limit = parseInt(req.query.limit) || 50;
    
    // Get location history
    const history = await getProfessionalLocationHistory(professionalId, limit);
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error in get location history route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while getting location history'
    });
  }
});

/**
 * @route GET /api/location/nearby
 * @desc Find professionals near a specific location
 * @access Private
 */
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance, status } = req.query;
    
    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }
    
    // Find nearby professionals
    const professionals = await findNearbyProfessionals(
      { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      maxDistance ? parseInt(maxDistance) : 10000,
      status || 'available'
    );
    
    res.status(200).json({
      success: true,
      data: professionals
    });
  } catch (error) {
    console.error('Error in nearby professionals route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while finding nearby professionals'
    });
  }
});

/**
 * @route POST /api/location/subscribe/:professionalId
 * @desc Subscribe to a professional's location updates
 * @access Private
 */
router.post('/subscribe/:professionalId', authenticate, async (req, res) => {
  try {
    const professionalId = req.params.professionalId;
    
    // Subscribe to updates
    const result = await subscribeToLocationUpdates(req.user.id, professionalId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in subscribe route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while subscribing to location updates'
    });
  }
});

/**
 * @route POST /api/location/unsubscribe/:professionalId
 * @desc Unsubscribe from a professional's location updates
 * @access Private
 */
router.post('/unsubscribe/:professionalId', authenticate, async (req, res) => {
  try {
    const professionalId = req.params.professionalId;
    
    // Unsubscribe from updates
    const result = await unsubscribeFromLocationUpdates(req.user.id, professionalId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in unsubscribe route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while unsubscribing from location updates'
    });
  }
});

export default router;