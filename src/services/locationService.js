import Location from '../models/locationModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';
import firebaseApp from '../config/firebase.js';
import { sendPushNotification } from './notificationService.js';

export const updateProfessionalLocation = async (userId, locationData) => {
  try {
    // Validate user exists and is a professional
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.role !== 'professional') {
      throw new Error('Only professionals can update their location');
    }
    
    // Find existing location document or create a new one
    let location = await Location.findOne({ user: userId });
    
    if (!location) {
      location = new Location({
        user: userId,
        current: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy || 0,
          speed: locationData.speed || 0,
          heading: locationData.heading || 0,
          timestamp: new Date()
        },
        status: 'offline',
        trackingEnabled: false
      });
    } else {
      // Update the location
      await location.updateLocation(locationData);
    }
    
    return location;
  } catch (error) {
    console.error('Error updating professional location:', error);
    throw error;
  }
};

export const updateProfessionalStatus = async (userId, status) => {
  try {
    // Validate status
    if (!['available', 'busy', 'offline'].includes(status)) {
      throw new Error('Invalid status. Must be available, busy, or offline');
    }
    
    // Find location document
    let location = await Location.findOne({ user: userId });
    
    if (!location) {
      throw new Error('Location tracking not initialized for this user');
    }
    
    // Update status
    await location.updateStatus(status);
    
    // If status is offline, update user availability as well
    if (status === 'offline') {
      await User.findByIdAndUpdate(userId, { isAvailable: false });
    } else {
      await User.findByIdAndUpdate(userId, { isAvailable: true });
    }
    
    return location;
  } catch (error) {
    console.error('Error updating professional status:', error);
    throw error;
  }
};

export const setTrackingEnabled = async (userId, enabled) => {
  try {
    // Find location document
    let location = await Location.findOne({ user: userId });
    
    if (!location) {
      // Create a new location document if it doesn't exist
      location = new Location({
        user: userId,
        trackingEnabled: enabled
      });
      await location.save();
    } else {
      // Update tracking status
      location.trackingEnabled = enabled;
      await location.save();
    }
    
    return location;
  } catch (error) {
    console.error('Error setting tracking status:', error);
    throw error;
  }
};


export const updateTrackingSettings = async (userId, settings) => {
  try {
    // Find location document
    let location = await Location.findOne({ user: userId });
    
    if (!location) {
      throw new Error('Location tracking not initialized for this user');
    }
    
    // Update settings
    await location.updateSettings(settings);
    
    return location;
  } catch (error) {
    console.error('Error updating tracking settings:', error);
    throw error;
  }
};


export const getProfessionalLocation = async (professionalId) => {
  try {
    const location = await Location.findOne({ user: professionalId })
      .populate('user', 'name phone role isAvailable rating');
    
    if (!location) {
      throw new Error('Location not found for this professional');
    }
    
    return location;
  } catch (error) {
    console.error('Error getting professional location:', error);
    throw error;
  }
};


export const getProfessionalLocationHistory = async (professionalId, limit = 50) => {
  try {
    const location = await Location.findOne({ user: professionalId });
    
    if (!location) {
      throw new Error('Location not found for this professional');
    }
    
    // Return the most recent history items up to the limit
    return location.history.slice(-limit).reverse();
  } catch (error) {
    console.error('Error getting professional location history:', error);
    throw error;
  }
};


export const findNearbyProfessionals = async (coordinates, maxDistance = 10000, status = 'available') => {
  try {
    return await Location.findNearbyProfessionals(coordinates, maxDistance, status);
  } catch (error) {
    console.error('Error finding nearby professionals:', error);
    throw error;
  }
};


export const subscribeToLocationUpdates = async (userId, professionalId) => {
  try {
    // Get the Firebase database reference
    const database = firebaseApp.database();
    const locationRef = database.ref(`locations/${professionalId}`);
    
    // Set up the subscription in Firebase
    await database.ref(`subscriptions/${professionalId}/${userId}`).set({
      userId,
      timestamp: Date.now()
    });
    
    return { success: true, message: 'Subscribed to location updates' };
  } catch (error) {
    console.error('Error subscribing to location updates:', error);
    throw error;
  }
};


export const unsubscribeFromLocationUpdates = async (userId, professionalId) => {
  try {
    // Get the Firebase database reference
    const database = firebaseApp.database();
    
    // Remove the subscription
    await database.ref(`subscriptions/${professionalId}/${userId}`).remove();
    
    return { success: true, message: 'Unsubscribed from location updates' };
  } catch (error) {
    console.error('Error unsubscribing from location updates:', error);
    throw error;
  }
};


export const notifyLocationSubscribers = async (professionalId, locationData) => {
  try {
    // Get the Firebase database reference
    const database = firebaseApp.database();
    
    // Get all subscribers for this professional
    const snapshot = await database.ref(`subscriptions/${professionalId}`).once('value');
    const subscribers = snapshot.val() || {};
    
    // Notify each subscriber
    const subscriberIds = Object.keys(subscribers);
    for (const subscriberId of subscriberIds) {
      // Send push notification
      await sendPushNotification({
        title: 'Location Update',
        message: 'Professional location has been updated',
        type: 'LOCATION_UPDATE',
        meta: {
          professionalId,
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: locationData.timestamp || Date.now()
          }
        }
      }, subscriberId);
    }
    
    return { success: true, notifiedCount: subscriberIds.length };
  } catch (error) {
    console.error('Error notifying location subscribers:', error);
    throw error;
  }
};