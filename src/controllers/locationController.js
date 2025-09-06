// src/controllers/locationController.js
import Location from '../models/locationModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';
import { sendPushNotification } from '../services/notificationService.js';
import {
  updateProfessionalLocation,
  updateProfessionalStatus,
  setTrackingEnabled,
  updateTrackingSettings,
  getProfessionalLocation as getProLocation,
  getProfessionalLocationHistory as getProLocationHistory,
  findNearbyProfessionals,
  notifyLocationSubscribers,
  subscribeToLocation,
  unsubscribeFromLocation,
  getSubscribedPros
} from '../services/locationService.js';

// Update professional location
export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, heading } = req.body;
    const userId = req.user.id;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
    }
    
    // Get user data to check if they're a professional
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'professional') {
      return res.status(403).json({ success: false, error: 'Only professionals can update location' });
    }
    
    // Create location data
    const locationData = {
      latitude,
      longitude,
      accuracy: accuracy || 0,
      speed: speed || 0,
      heading: heading || 0
    };
    
    // Update professional location using the service
    const location = await updateProfessionalLocation(userId, locationData);
    
    // Notify subscribers if any
    await notifyLocationSubscribers(userId, {
      latitude,
      longitude,
      accuracy,
      timestamp: new Date().getTime()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update location'
    });
  }
};

// Update professional status
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;
    
    if (!status || !['available', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status is required' });
    }
    
    // Get user data to check if they're a professional
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'professional') {
      return res.status(403).json({ success: false, error: 'Only professionals can update status' });
    }
    
    // Update status using the service
    const location = await updateProfessionalStatus(userId, status);
    
    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: location
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update status'
    });
  }
};

// Enable or disable tracking
export const setTrackingEnabled = async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.id;
    
    if (enabled === undefined) {
      return res.status(400).json({ success: false, error: 'Enabled status is required' });
    }
    
    // Get user data to check if they're a professional
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'professional') {
      return res.status(403).json({ success: false, error: 'Only professionals can update tracking status' });
    }
    
    // Update tracking status using the service
    const location = await setTrackingEnabled(userId, enabled);
    
    return res.status(200).json({
      success: true,
      message: `Tracking ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: location
    });
  } catch (error) {
    console.error('Error setting tracking status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to set tracking status'
    });
  }
};

// Update tracking settings
export const updateTrackingSettings = async (req, res) => {
  try {
    const { updateInterval, significantChangeThreshold, batteryOptimizationEnabled, maxHistoryItems } = req.body;
    const userId = req.user.id;
    
    // Get user data to check if they're a professional
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'professional') {
      return res.status(403).json({ success: false, error: 'Only professionals can update tracking settings' });
    }
    
    // Create settings object
    const settings = {};
    
    if (updateInterval !== undefined) {
      settings.updateInterval = updateInterval;
    }
    
    if (significantChangeThreshold !== undefined) {
      settings.significantChangeThreshold = significantChangeThreshold;
    }
    
    if (batteryOptimizationEnabled !== undefined) {
      settings.batteryOptimizationEnabled = batteryOptimizationEnabled;
    }
    
    if (maxHistoryItems !== undefined) {
      settings.maxHistoryItems = maxHistoryItems;
    }
    
    // Update tracking settings using the service
    const location = await updateTrackingSettings(userId, settings);
    
    return res.status(200).json({
      success: true,
      message: 'Tracking settings updated successfully',
      data: location
    });
  } catch (error) {
    console.error('Error updating tracking settings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update tracking settings'
    });
  }
};

// Get professional's current location
export const getProfessionalLocation = async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      // Get professional location using the service
      const location = await getProLocation(id);
      
      return res.status(200).json({
        success: true,
        data: location
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
      } else if (error.message.includes('disabled')) {
        return res.status(403).json({ success: false, error: error.message });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting professional location:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get professional location'
    });
  }
};

// Get professional's location history
export const getProfessionalLocationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    try {
      // Get professional location history using the service
      const history = await getProLocationHistory(id, parseInt(limit));
      
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
      } else if (error.message.includes('disabled')) {
        return res.status(403).json({ success: false, error: error.message });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting location history:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get location history'
    });
  }
};

// Get nearby professionals
export const getNearbyProfessionals = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, status = 'available' } = req.query; // radius in meters, default 5km
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
    }
    
    // Convert string parameters to appropriate types
    const coordinates = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
    const maxDistance = parseFloat(radius);
    
    // Find nearby professionals using the service
    const professionals = await findNearbyProfessionals(coordinates, maxDistance, status);
    
    return res.status(200).json({
      success: true,
      data: professionals
    });
  } catch (error) {
    console.error('Error finding nearby professionals:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to find nearby professionals'
    });
  }
};

// These helper functions have been moved to the locationService.js file

// Subscribe to location updates
export const subscribeToLocationUpdates = async (req, res) => {
  try {
    const { professionalId } = req.body;
    const userId = req.user.id;
    
    try {
      // Subscribe to location updates using the service
      const result = await subscribeToLocation(userId, professionalId);
      
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error subscribing to location updates:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to subscribe to location updates'
    });
  }
};

// Get professionals that user is subscribed to
export const getSubscribedProfessionals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get subscribed professionals using the service
    const subscribedProfessionals = await getSubscribedPros(userId);
    
    return res.status(200).json({
      success: true,
      data: subscribedProfessionals
    });
  } catch (error) {
    console.error('Error getting subscribed professionals:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get subscribed professionals'
    });
  }
};

// Unsubscribe from location updates
export const unsubscribeFromLocationUpdates = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const userId = req.user.id;
    
    try {
      // Unsubscribe from location updates using the service
      const result = await unsubscribeFromLocation(userId, professionalId);
      
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error unsubscribing from location updates:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to unsubscribe from location updates'
    });
  }
};