import { firestore, database, messaging } from "../config/firebase.js";
import { AppError } from '../middleware/errorMiddleware.js';

/**
 * FirebaseService - Service for Firebase-related operations
 * Handles notifications and real-time location tracking
 */
class FirebaseService {
  /**
   * Update professional's location in Firebase Realtime Database
   * @param {string} userId - User ID
   * @param {Object} locationData - Location data (latitude, longitude, etc.)
   * @returns {Promise<void>}
   */
  static async updateLocation(userId, locationData) {
    try {
      const { latitude, longitude, accuracy, speed, heading } = locationData;
      
      if (!latitude || !longitude) {
        throw new AppError('Latitude and longitude are required', 400);
      }
      
      // Get user data to check if they're a professional
      const userDoc = await firestore.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData || userData.role !== 'professional') {
        throw new AppError('Only professionals can update location', 403);
      }
      
      // Update location in Realtime Database
      const locationRef = database.ref(`locations/${userId}/current`);
      await locationRef.set({
        latitude,
        longitude,
        accuracy: accuracy || null,
        speed: speed || null,
        heading: heading || null,
        timestamp: database.ServerValue.TIMESTAMP,
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
        timestamp: database.ServerValue.TIMESTAMP,
        status: userData.status || 'available'
      });
      
      return true;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Update professional's status in Firebase
   * @param {string} userId - User ID
   * @param {string} status - Status ('available', 'busy', 'offline')
   * @returns {Promise<void>}
   */
  static async updateStatus(userId, status) {
    try {
      if (!status || !['available', 'busy', 'offline'].includes(status)) {
        throw new AppError('Valid status is required', 400);
      }
      
      // Get user data to check if they're a professional
      const userDoc = await firestore.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData || userData.role !== 'professional') {
        throw new AppError('Only professionals can update status', 403);
      }
      
      // Update status in Firestore
      await firestore.collection('users').doc(userId).update({
        status,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
      // Update status in current location
      const locationRef = database.ref(`locations/${userId}/current`);
      const snapshot = await locationRef.once('value');
      
      if (snapshot.exists()) {
        await locationRef.update({
          status,
          timestamp: database.ServerValue.TIMESTAMP
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  /**
   * Send notification to a user
   * @param {string} token - FCM token
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Messaging response
   */
  static async sendNotification(token, notification) {
    try {
      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {}
      };
      
      return await messaging.send(message);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array<string>} tokens - FCM tokens
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Messaging response
   */
  static async sendMulticastNotification(tokens, notification) {
    try {
      const message = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {}
      };
      
      return await messaging.sendMulticast(message);
    } catch (error) {
      console.error('Error sending multicast notification:', error);
      throw error;
    }
  }
  
  /**
   * Update tracking enabled status for a professional
   * @param {string} userId - User ID
   * @param {boolean} enabled - Whether tracking is enabled
   * @returns {Promise<boolean>} Success status
   */
  static async updateTrackingEnabled(userId, enabled) {
    try {
      // Update tracking settings in Firestore
      await firestore.collection('users').doc(userId).update({
        trackingEnabled: enabled,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
      // If tracking is disabled, update status to offline
      if (!enabled) {
        const locationRef = database.ref(`locations/${userId}/current`);
        await locationRef.update({
          status: 'offline',
          trackingEnabled: false,
          timestamp: database.ServerValue.TIMESTAMP
        });
      } else {
        const locationRef = database.ref(`locations/${userId}/current`);
        await locationRef.update({
          trackingEnabled: true,
          timestamp: database.ServerValue.TIMESTAMP
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating tracking settings:', error);
      throw error;
    }
  }
}

export default FirebaseService;