import { auth, firestore, database, messaging } from "../config/firebase.js";
// Authentication Controllers
export const register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Create user with Firebase Admin SDK
    const userRecord = await auth.createUser({
      email,
      password,
      displayName
    });
    
    // Create user document in Firestore
    await firestore.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'user' // Default role
    });
    
    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: 'user'
        }
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register user'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Missing email or password' });
    }
    
    // This would typically be handled by Firebase Authentication SDK on the client
    // For backend implementation, we need to use Firebase Admin SDK to verify credentials
    // and create custom tokens
    
    // For demonstration purposes, we'll create a custom token
    // In a real implementation, you would verify credentials first
    
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    
    // Create custom token
    const token = await auth.createCustomToken(userRecord.uid);
    
    // Get user data from Firestore
    const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();
    
    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: userData.role || 'user'
        }
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    // Generate password reset link
    const link = await auth.generatePasswordResetLink(email);
    
    // In a real implementation, you would send this link via email
    console.log('Password reset link:', link);
    
    return res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset password'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { displayName } = req.body;
    const userId = req.user.id;
    
    if (!displayName) {
      return res.status(400).json({ success: false, error: 'Display name is required' });
    }
    
    // Update user profile in Firebase Auth
    await auth.updateUser(userId, { displayName });
    
    // Update user document in Firestore
    await firestore.collection('users').doc(userId).update({
      displayName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Get updated user data
    const userRecord = await auth.getUser(userId);
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: userData.role || 'user'
        }
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
};

export const updateEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    // Update user email in Firebase Auth
    await auth.updateUser(userId, { email });
    
    // Update user document in Firestore
    await firestore.collection('users').doc(userId).update({
      email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Get updated user data
    const userRecord = await auth.getUser(userId);
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: userData.role || 'user'
        }
      }
    });
  } catch (error) {
    console.error('Error updating email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update email'
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;
    
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }
    
    // Update user password in Firebase Auth
    await auth.updateUser(userId, { password });
    
    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update password'
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Firebase Auth doesn't have a server-side logout
    // We can revoke refresh tokens if needed
    const userId = req.user.id;
    await auth.revokeRefreshTokens(userId);
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to logout'
    });
  }
};

// Location Controllers
export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, heading } = req.body;
    const userId = req.user.id;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
    }
    
    // Get user data to check if they're a professional
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'professional') {
      return res.status(403).json({ success: false, error: 'Only professionals can update location' });
    }
    
    // Update location in Realtime Database
    const locationRef = database.ref(`locations/${userId}/current`);
    await locationRef.set({
      latitude,
      longitude,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      status: userData.status || 'available'
    });
    
    // Add to location history
    const historyRef = database.ref(`locations/${userId}/history`).push();
    await historyRef.set({
      latitude,
      longitude,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      status: userData.status || 'available'
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

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;
    
    if (!status || !['available', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status is required' });
    }
    
    // Get user data to check if they're a professional
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'professional') {
      return res.status(403).json({ success: false, error: 'Only professionals can update status' });
    }
    
    // Update status in Firestore
    await firestore.collection('users').doc(userId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update status in current location
    const locationRef = database.ref(`locations/${userId}/current`);
    const snapshot = await locationRef.once('value');
    
    if (snapshot.exists()) {
      await locationRef.update({
        status,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update status'
    });
  }
};

export const setTrackingEnabled = async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.id;
    
    if (enabled === undefined) {
      return res.status(400).json({ success: false, error: 'Enabled flag is required' });
    }
    
    // Get user data to check if they're a professional
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'professional') {
      return res.status(403).json({ success: false, error: 'Only professionals can update tracking settings' });
    }
    
    // Update tracking settings in Firestore
    await firestore.collection('users').doc(userId).update({
      trackingEnabled: enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.status(200).json({
      success: true,
      message: `Tracking ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error setting tracking enabled:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update tracking settings'
    });
  }
};

export const updateTrackingSettings = async (req, res) => {
  try {
    const { updateInterval, significantChangeThreshold, batteryOptimizationEnabled, maxHistoryItems } = req.body;
    const userId = req.user.id;
    
    // Get user data to check if they're a professional
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'professional') {
      return res.status(403).json({ success: false, error: 'Only professionals can update tracking settings' });
    }
    
    // Update tracking settings in Firestore
    const settings = {};
    
    if (updateInterval !== undefined) settings.updateInterval = updateInterval;
    if (significantChangeThreshold !== undefined) settings.significantChangeThreshold = significantChangeThreshold;
    if (batteryOptimizationEnabled !== undefined) settings.batteryOptimizationEnabled = batteryOptimizationEnabled;
    if (maxHistoryItems !== undefined) settings.maxHistoryItems = maxHistoryItems;
    
    settings.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await firestore.collection('users').doc(userId).update(settings);
    
    return res.status(200).json({
      success: true,
      message: 'Tracking settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating tracking settings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update tracking settings'
    });
  }
};

export const getProfessionalLocation = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Professional ID is required' });
    }
    
    // Get user data to check if they're a professional
    const userDoc = await firestore.collection('users').doc(id).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'professional') {
      return res.status(404).json({ success: false, error: 'Professional not found' });
    }
    
    // Get current location from Realtime Database
    const locationRef = database.ref(`locations/${id}/current`);
    const snapshot = await locationRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }
    
    const locationData = snapshot.val();
    
    return res.status(200).json({
      success: true,
      data: locationData
    });
  } catch (error) {
    console.error('Error getting professional location:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get professional location'
    });
  }
};

export const getProfessionalLocationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Professional ID is required' });
    }
    
    // Get user data to check if they're a professional
    const userDoc = await firestore.collection('users').doc(id).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'professional') {
      return res.status(404).json({ success: false, error: 'Professional not found' });
    }
    
    // Get location history from Realtime Database
    const historyRef = database.ref(`locations/${id}/history`).limitToLast(parseInt(limit));
    const snapshot = await historyRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    const historyData = [];
    snapshot.forEach((childSnapshot) => {
      historyData.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    // Sort by timestamp (newest first)
    historyData.sort((a, b) => b.timestamp - a.timestamp);
    
    return res.status(200).json({
      success: true,
      data: historyData
    });
  } catch (error) {
    console.error('Error getting location history:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get location history'
    });
  }
};

export const getNearbyProfessionals = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5, status } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius);
    
    // Get all professionals
    const professionalsSnapshot = await firestore.collection('users')
      .where('role', '==', 'professional')
      .get();
    
    if (professionalsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Get locations for all professionals
    const professionals = [];
    const locationPromises = [];
    
    professionalsSnapshot.forEach((doc) => {
      const professional = doc.data();
      professional.id = doc.id;
      
      // Skip professionals with tracking disabled
      if (professional.trackingEnabled === false) {
        return;
      }
      
      // Filter by status if provided
      if (status && professional.status !== status) {
        return;
      }
      
      const locationPromise = database.ref(`locations/${doc.id}/current`).once('value');
      locationPromises.push({
        professional,
        promise: locationPromise
      });
    });
    
    // Wait for all location promises to resolve
    for (const { professional, promise } of locationPromises) {
      const snapshot = await promise;
      
      if (snapshot.exists()) {
        const location = snapshot.val();
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          lat,
          lng,
          location.latitude,
          location.longitude
        );
        
        // Only include professionals within the radius
        if (distance <= rad) {
          professionals.push({
            ...professional,
            location,
            distance
          });
        }
      }
    }
    
    // Sort by distance (closest first)
    professionals.sort((a, b) => a.distance - b.distance);
    
    return res.status(200).json({
      success: true,
      data: professionals
    });
  } catch (error) {
    console.error('Error getting nearby professionals:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get nearby professionals'
    });
  }
};

export const subscribeToLocationUpdates = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const userId = req.user.id;
    
    if (!professionalId) {
      return res.status(400).json({ success: false, error: 'Professional ID is required' });
    }
    
    // Check if professional exists
    const professionalDoc = await firestore.collection('users').doc(professionalId).get();
    
    if (!professionalDoc.exists || professionalDoc.data().role !== 'professional') {
      return res.status(404).json({ success: false, error: 'Professional not found' });
    }
    
    // Add subscription in Firestore
    await firestore.collection('locationSubscriptions').doc(`${userId}_${professionalId}`).set({
      userId,
      professionalId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Subscribed to location updates successfully'
    });
  } catch (error) {
    console.error('Error subscribing to location updates:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to subscribe to location updates'
    });
  }
};

export const unsubscribeFromLocationUpdates = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const userId = req.user.id;
    
    if (!professionalId) {
      return res.status(400).json({ success: false, error: 'Professional ID is required' });
    }
    
    // Remove subscription from Firestore
    await firestore.collection('locationSubscriptions').doc(`${userId}_${professionalId}`).delete();
    
    return res.status(200).json({
      success: true,
      message: 'Unsubscribed from location updates successfully'
    });
  } catch (error) {
    console.error('Error unsubscribing from location updates:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to unsubscribe from location updates'
    });
  }
};

// Notification Controllers
export const registerDevice = async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.id;
    
    if (!token || !platform) {
      return res.status(400).json({ success: false, error: 'Token and platform are required' });
    }
    
    // Add device token to Firestore
    await firestore.collection('deviceTokens').doc(token).set({
      userId,
      token,
      platform,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Device registered successfully'
    });
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register device'
    });
  }
};

export const deregisterDevice = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }
    
    // Remove device token from Firestore
    await firestore.collection('deviceTokens').doc(token).delete();
    
    return res.status(200).json({
      success: true,
      message: 'Device deregistered successfully'
    });
  } catch (error) {
    console.error('Error deregistering device:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to deregister device'
    });
  }
};

export const sendNotification = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({ success: false, error: 'User ID, title, and body are required' });
    }
    
    // Get user's device tokens
    const tokensSnapshot = await firestore.collection('deviceTokens')
      .where('userId', '==', userId)
      .get();
    
    if (tokensSnapshot.empty) {
      return res.status(404).json({ success: false, error: 'No devices found for user' });
    }
    
    const tokens = [];
    tokensSnapshot.forEach((doc) => {
      tokens.push(doc.data().token);
    });
    
    // Send notification
    const message = {
      notification: {
        title,
        body
      },
      data: data || {},
      tokens
    };
    
    const response = await messaging.sendMulticast(message);
    
    return res.status(200).json({
      success: true,
      message: `Notification sent successfully to ${response.successCount} devices`,
      data: {
        successCount: response.successCount,
        failureCount: response.failureCount
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification'
    });
  }
};

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}