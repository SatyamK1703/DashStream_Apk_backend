
import DeviceToken from '../models/deviceTokenModel.js';
import Notification from '../models/notificationModel.js';
import firebaseApp from '../config/firebase.js';

//Send a push notification to a user's devices

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

    // Send to each device token using Firebase Cloud Messaging
    console.log('Push notification payload:', pushPayload);
    console.log(`Sending to ${deviceTokens.length} devices`);

    // Send notification using Firebase Admin SDK
    if (deviceTokens.length > 0) {
      try {
        const messaging = firebaseApp.messaging();
        const response = await messaging.sendMulticast({
          tokens: deviceTokens.map(dt => dt.token),
          ...pushPayload
        });
        
        console.log(`Successfully sent message: ${response.successCount} successful, ${response.failureCount} failed`);
        
        // Handle failures if needed
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(deviceTokens[idx].token);
              console.error('Error sending to token:', resp.error);
            }
          });
          
          // You might want to handle failed tokens (e.g., remove invalid ones)
          console.log('Failed tokens:', failedTokens);
        }
      } catch (fcmError) {
        console.error('Firebase messaging error:', fcmError);
        // Continue execution even if FCM fails
      }
    }

    return notification;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

//Send a notification to multiple users

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

//Send a booking notification

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