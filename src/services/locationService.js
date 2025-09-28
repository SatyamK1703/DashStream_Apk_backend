import Location from '../models/locationModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';
import { sendPushNotification } from './notificationService.js';
import FirebaseService from './FirebaseService.js';
import { 
  withErrorHandling, 
  validateCoordinates, 
  validateStatus, 
  ErrorCodes 
} from '../utils/locationErrorHandler.js';
import AppError from '../utils/appError.js';

const _updateProfessionalLocation = async (userId, locationData) => {
  // Validate coordinates
  validateCoordinates({
    latitude: locationData.latitude,
    longitude: locationData.longitude
  });

  // Validate user exists and is a professional
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
  }
  
  if (user.role !== 'professional') {
    throw new AppError('Only professionals can update their location', 403, ErrorCodes.ROLE_INVALID);
  }
  
  // Find existing location document or create a new one
  let location = await Location.findOne({ user: userId });
  
  if (!location) {
    location = new Location({
      user: userId,
      current: {
        type: 'Point',
        coordinates: [locationData.longitude, locationData.latitude],
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
  
  // Update location in Firebase using FirebaseService
  await FirebaseService.updateLocation(userId, locationData);
  
  return location;
};

export const updateProfessionalLocation = withErrorHandling(_updateProfessionalLocation, 'updateProfessionalLocation');

const _updateProfessionalStatus = async (userId, status) => {
  // Validate status
  validateStatus(status);
  
  // Find location document
  let location = await Location.findOne({ user: userId });
  
  if (!location) {
    throw new AppError('Location tracking not initialized for this user', 404, ErrorCodes.LOCATION_NOT_INITIALIZED);
  }
  
  // Update status
  await location.updateStatus(status);
  
  // Update status in Firebase using FirebaseService
  await FirebaseService.updateStatus(userId, status);
  
  // If status is offline, update user availability as well
  if (status === 'offline') {
    await User.findByIdAndUpdate(userId, { isAvailable: false });
  } else {
    await User.findByIdAndUpdate(userId, { isAvailable: true });
  }
  
  return location;
};

export const updateProfessionalStatus = withErrorHandling(_updateProfessionalStatus, 'updateProfessionalStatus');

const _setTrackingEnabled = async (userId, enabled) => {
  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
  }
  
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
  
  // Update tracking enabled status in Firebase
  await FirebaseService.updateTrackingEnabled(userId, enabled);
  
  return location;
};

export const setTrackingEnabled = withErrorHandling(_setTrackingEnabled, 'setTrackingEnabled');


const _updateTrackingSettings = async (userId, settings) => {
  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
  }

  // Find location document
  let location = await Location.findOne({ user: userId });
  
  if (!location) {
    throw new AppError('Location tracking not initialized for this user', 404, ErrorCodes.LOCATION_NOT_INITIALIZED);
  }
  
  // Update settings
  await location.updateSettings(settings);
  
  return location;
};

export const updateTrackingSettings = withErrorHandling(_updateTrackingSettings, 'updateTrackingSettings');


const _getProfessionalLocation = async (professionalId) => {
  // Validate professional exists
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new AppError('Professional not found', 404, ErrorCodes.USER_NOT_FOUND);
  }

  if (professional.role !== 'professional') {
    throw new AppError('User is not a professional', 400, ErrorCodes.ROLE_INVALID);
  }

  const location = await Location.findOne({ user: professionalId })
    .populate('user', 'name phone role isAvailable rating');
  
  if (!location) {
    throw new AppError('Location not found for this professional', 404, ErrorCodes.LOCATION_NOT_FOUND);
  }
  
  return location;
};

export const getProfessionalLocation = withErrorHandling(_getProfessionalLocation, 'getProfessionalLocation');


const _getProfessionalLocationHistory = async (professionalId, limit = 50) => {
  // Validate professional exists
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new AppError('Professional not found', 404, ErrorCodes.USER_NOT_FOUND);
  }

  if (professional.role !== 'professional') {
    throw new AppError('User is not a professional', 400, ErrorCodes.ROLE_INVALID);
  }

  const location = await Location.findOne({ user: professionalId });
  
  if (!location) {
    throw new AppError('Location not found for this professional', 404, ErrorCodes.LOCATION_NOT_FOUND);
  }
  
  if (!location.history || location.history.length === 0) {
    throw new AppError('Location history is empty', 404, ErrorCodes.LOCATION_HISTORY_EMPTY);
  }
  
  // Return the most recent history items up to the limit
  return location.history.slice(-limit).reverse();
};

export const getProfessionalLocationHistory = withErrorHandling(_getProfessionalLocationHistory, 'getProfessionalLocationHistory');


const _findNearbyProfessionals = async (coordinates, maxDistance = 10000, status = 'available', filters = {}) => {
  // Validate coordinates
  validateCoordinates(coordinates);
  
  // Validate status if provided
  if (status !== 'all') {
    validateStatus(status);
  }
  
  // Generate cache key
  const cacheKey = generateNearbyKey(coordinates, maxDistance, { status, ...filters });
  
  // Check cache first
  const cachedResults = nearbyProfessionalsCache.get(cacheKey);
  if (cachedResults) {
    return cachedResults;
  }
  
  // Convert maxDistance from meters to kilometers if needed
  const distanceInMeters = maxDistance;
  
  // Apply additional filters if provided
  const queryFilters = {};
  if (filters.services && filters.services.length > 0) {
    queryFilters.services = { $in: filters.services };
  }
  if (filters.specialties && filters.specialties.length > 0) {
    queryFilters.specialties = { $in: filters.specialties };
  }
  
  // Use the static method from the Location model with filters
  const professionals = await Location.findNearbyProfessionals(coordinates, distanceInMeters, status, queryFilters);
  
  // Format the response to include distance in a readable format
  const formattedResults = professionals.map(prof => ({
    ...prof,
    distance: parseFloat(prof.distance.toFixed(2)) // Round to 2 decimal places
  }));
  
  // Cache the results
  nearbyProfessionalsCache.set(cacheKey, formattedResults);
  
  return formattedResults;
};

export const findNearbyProfessionals = withErrorHandling(_findNearbyProfessionals, 'findNearbyProfessionals');


const _subscribeToLocationUpdates = async (userId, professionalId) => {
  // Validate users exist
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
  }
  
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new AppError('Professional not found', 404, ErrorCodes.USER_NOT_FOUND);
  }
  
  if (professional.role !== 'professional') {
    throw new AppError('Target user is not a professional', 400, ErrorCodes.ROLE_INVALID);
  }
  
  // Check if location tracking is enabled for the professional
  const location = await Location.findOne({ user: professionalId });
  if (!location || !location.trackingEnabled) {
    throw new AppError('Location tracking is not enabled for this professional', 400, ErrorCodes.TRACKING_DISABLED);
  }
  
  // Check if already subscribed
  const exists = await pathExists(`subscriptions/${professionalId}/${userId}`);
  if (exists) {
    return { success: true, message: 'Already subscribed to location updates' };
  }
  
  // Set up the subscription in Firebase
  await safeWrite(`subscriptions/${professionalId}/${userId}`, {
    userId,
    timestamp: Date.now()
  });
  
  // Notify the professional about the new subscriber
  await sendPushNotification({
    title: 'New Location Subscriber',
    message: `A user is now tracking your location`,
    type: 'SUBSCRIPTION_ADDED',
    meta: { subscriberId: userId }
  }, professionalId);
  
  return { success: true, message: 'Subscribed to location updates' };
};

export const subscribeToLocationUpdates = withErrorHandling(_subscribeToLocationUpdates, 'subscribeToLocationUpdates');


const _unsubscribeFromLocationUpdates = async (userId, professionalId) => {
  // Validate users exist
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
  }
  
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new AppError('Professional not found', 404, ErrorCodes.USER_NOT_FOUND);
  }
  
  // Check if subscription exists
  const exists = await pathExists(`subscriptions/${professionalId}/${userId}`);
  if (!exists) {
    throw new AppError('Subscription not found', 404, ErrorCodes.SUBSCRIPTION_NOT_FOUND);
  }
  
  // Remove the subscription
  await safeRemove(`subscriptions/${professionalId}/${userId}`);
  
  // Notify the professional about the unsubscription
  await sendPushNotification({
    title: 'Location Subscription Ended',
    message: `A user has stopped tracking your location`,
    type: 'SUBSCRIPTION_REMOVED',
    meta: { subscriberId: userId }
  }, professionalId);
  
  return { success: true, message: 'Unsubscribed from location updates' };
};

export const unsubscribeFromLocationUpdates = withErrorHandling(_unsubscribeFromLocationUpdates, 'unsubscribeFromLocationUpdates');



import { Client } from '@googlemaps/google-maps-services-js';

const _getReverseGeocode = async (latitude, longitude) => {
  const client = new Client({});
  const response = await client.reverseGeocode({
    params: {
      latlng: { latitude, longitude },
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });

  if (response.data.results.length > 0) {
    return response.data.results[0].formatted_address;
  } else {
    throw new AppError('No address found for the given coordinates', 404);
  }
};

export const getReverseGeocode = withErrorHandling(_getReverseGeocode, 'getReverseGeocode');


const _notifyLocationSubscribers = async (professionalId, locationData) => {
  // Validate professional exists
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new AppError('Professional not found', 404, ErrorCodes.USER_NOT_FOUND);
  }
  
  if (professional.role !== 'professional') {
    throw new AppError('User is not a professional', 400, ErrorCodes.ROLE_INVALID);
  }
  
  // Validate coordinates
  validateCoordinates({
    latitude: locationData.latitude,
    longitude: locationData.longitude
  });
  
  // Update the professional's location in Firebase
  await safeWrite(`locations/${professionalId}`, {
    ...locationData,
    timestamp: locationData.timestamp || Date.now(),
    updatedAt: Date.now()
  });
  
  // Get all subscribers for this professional
  const subscribers = await safeRead(`subscriptions/${professionalId}`) || {};
  
  // Prepare batch notifications
  const subscriberIds = Object.keys(subscribers);
  
  if (subscriberIds.length > 0) {
    // Create notification payload
    const notificationPayload = {
      title: `${professional.name || 'Professional'} Location Update`,
      message: 'Professional location has been updated',
      type: 'LOCATION_UPDATE',
      meta: {
        professionalId,
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy || 0,
          speed: locationData.speed || 0,
          heading: locationData.heading || 0,
          timestamp: locationData.timestamp || Date.now(),
          // Include distance if available
          ...(locationData.distance ? { distance: locationData.distance } : {})
        }
      }
    };
    
    // Use batch operation for notifications if there are multiple subscribers
    if (subscriberIds.length > 1) {
      const notificationBatch = {};
      
      // Prepare batch updates for notifications
      subscriberIds.forEach(subscriberId => {
        notificationBatch[`notifications/${subscriberId}/${Date.now()}`] = {
          ...notificationPayload,
          timestamp: Date.now(),
          read: false
        };
      });
      
      // Execute batch write
      await batchWrite(notificationBatch);
      
      // Send push notifications in parallel
      await Promise.all(subscriberIds.map(subscriberId => 
        sendPushNotification(notificationPayload, subscriberId)
      ));
    } else if (subscriberIds.length === 1) {
      // For a single subscriber, just send directly
      await sendPushNotification(notificationPayload, subscriberIds[0]);
    }
  }
  
  return { success: true, notifiedCount: subscriberIds.length };
};

export const notifyLocationSubscribers = withErrorHandling(_notifyLocationSubscribers, 'notifyLocationSubscribers');