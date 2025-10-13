
import DeviceToken from '../models/deviceTokenModel.js';
import Notification from '../models/notificationModel.js';
import FirebaseService from './FirebaseService.js';

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

    // Send notification using FirebaseService
    if (deviceTokens.length > 0) {
      try {
        const tokens = deviceTokens.map(dt => dt.token);
        const response = await FirebaseService.sendMulticastNotification(tokens, {
          title: pushPayload.notification.title,
          body: pushPayload.notification.body,
          data: pushPayload.data
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

import User from '../models/userModel.js';

//Send a booking notification

export const sendBookingNotification = async (booking, status) => {
  let title, message, actionType;

  switch (status) {
    case 'created':
      title = 'New Booking Created';
      message = `A new booking has been created for ${booking.service.name}.`;
      actionType = 'open_booking';
      break;
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
    case 'rated':
      title = 'New Rating';
      message = `A new rating has been submitted for your booking of ${booking.service.name}.`;
      actionType = 'open_booking';
      break;
    default:
      title = 'Booking Update';
      message = `There's an update to your booking for ${booking.service.name}.`;
      actionType = 'open_booking';
  }

  const customerId = booking.user;
  const professionalId = booking.professional;
  const admins = await User.find({ role: 'admin' });
  const adminIds = admins.map(admin => admin._id);

  const recipients = [customerId, ...adminIds];
  if (professionalId) {
    recipients.push(professionalId);
  }

  const notificationData = {
    title,
    message,
    type: 'booking',
    relatedId: booking._id.toString(),
    actionType,
    actionParams: { bookingId: booking._id.toString() },
  };

  return await sendBulkNotifications(notificationData, recipients);
};

//Send a membership notification

export const sendMembershipNotification = async (membership, userId, status) => {
  let title, message, actionType;

  switch (status) {
    case 'purchased':
      title = 'Membership Purchased';
      message = `You have successfully purchased the ${membership.plan.name} membership.`;
      actionType = 'open_membership';
      break;
    case 'renewed':
      title = 'Membership Renewed';
      message = `Your ${membership.plan.name} membership has been renewed.`;
      actionType = 'open_membership';
      break;
    case 'cancelled':
      title = 'Membership Cancelled';
      message = `Your ${membership.plan.name} membership has been cancelled.`;
      actionType = 'open_membership';
      break;
    case 'expired':
      title = 'Membership Expired';
      message = `Your ${membership.plan.name} membership has expired.`;
      actionType = 'open_membership';
      break;
    default:
      title = 'Membership Update';
      message = `There's an update to your membership.`;
      actionType = 'open_membership';
  }

  return await sendPushNotification({
    title,
    message,
    type: 'membership',
    relatedId: membership._id.toString(),
    actionType,
    actionParams: { membershipId: membership._id.toString() },
  }, userId);
};