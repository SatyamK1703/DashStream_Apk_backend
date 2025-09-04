/**
 * Notification Service
 * Handles sending push notifications to mobile devices
 */
import DeviceToken from '../models/deviceTokenModel.js';
import Notification from '../models/notificationModel.js';

/**
 * Send a push notification to a user's devices
 * @param {Object} notificationData - The notification data
 * @param {String} userId - The recipient user ID
 * @returns {Promise} - The created notification
 */
export const sendPushNotification = async (notificationData, userId) => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      recipient: userId,
      ...notificationData
    });

    // Get user's active device tokens
    const deviceTokens = await DeviceToken.getActiveTokensForUser(userId);
    
    if (deviceTokens.length === 0) {
      console.log(`No active device tokens found for user ${userId}`);
      return notification;
    }

    // Format notification payload for push service
    const pushPayload = {
      notification: {
        title: notificationData.title,
        body: notificationData.message,
        image: notificationData.image || undefined
      },
      data: {
        notificationId: notification._id.toString(),
        type: notificationData.type,
        actionType: notificationData.actionType || 'none',
        ...(notificationData.actionParams || {}),
        ...(notificationData.meta || {})
      }
    };

    // Send to each device token
    // This would typically use a push notification service like Firebase
    // For now, we'll just log the payload
    console.log('Push notification payload:', pushPayload);
    console.log(`Would send to ${deviceTokens.length} devices`);

    // In a real implementation, you would send to Firebase or another push service here
    // Example with Firebase:
    // await admin.messaging().sendMulticast({
    //   tokens: deviceTokens.map(dt => dt.token),
    //   ...pushPayload
    // });

    return notification;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send a notification to multiple users
 * @param {Object} notificationData - The notification data
 * @param {Array} userIds - Array of user IDs to notify
 * @returns {Promise} - Array of created notifications
 */
export const sendBulkNotifications = async (notificationData, userIds) => {
  try {
    const notifications = [];
    
    for (const userId of userIds) {
      const notification = await sendPushNotification(notificationData, userId);
      notifications.push(notification);
    }
    
    return notifications;
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw error;
  }
};

/**
 * Send a booking notification
 * @param {Object} booking - The booking object
 * @param {String} recipientId - The recipient user ID
 * @param {String} status - The booking status
 * @returns {Promise} - The created notification
 */
export const sendBookingNotification = async (booking, recipientId, status) => {
  let title, message, actionType;
  
  switch (status) {
    case 'confirmed':
      title = 'Booking Confirmed';
      message = `Your booking for ${booking.service.name} has been confirmed.`;
      actionType = 'open_booking';
      break;
    case 'completed':
      title = 'Service Completed';
      message = `Your booking for ${booking.service.name} has been marked as completed.`;
      actionType = 'open_booking';
      break;
    case 'cancelled':
      title = 'Booking Cancelled';
      message = `Your booking for ${booking.service.name} has been cancelled.`;
      actionType = 'open_booking';
      break;
    case 'in-progress':
      title = 'Service In Progress';
      message = `Your booking for ${booking.service.name} is now in progress.`;
      actionType = 'open_booking';
      break;
    case 'assigned':
      title = 'Professional Assigned';
      message = `A professional has been assigned to your booking for ${booking.service.name}.`;
      actionType = 'open_booking';
      break;
    case 'rejected':
      title = 'Booking Rejected';
      message = `Your booking for ${booking.service.name} has been rejected.`;
      actionType = 'open_booking';
      break;
    default:
      title = 'Booking Update';
      message = `There's an update to your booking for ${booking.service.name}.`;
      actionType = 'open_booking';
  }
  
  return await sendPushNotification({
    title,
    message,
    type: 'booking',
    relatedId: booking._id.toString(),
    actionType,
    actionParams: { bookingId: booking._id.toString() },
    priority: status === 'cancelled' ? 'high' : 'default'
  }, recipientId);
};