
import { asyncHandler } from '../middleware/errorMiddleware.js';
import AppError from '../utils/appError.js';
import Notification from '../models/notificationModel.js';
import { sendPushNotification } from '../services/notificationService.js';

//GET /api/notifications
export const getMyNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort('-createdAt');

  res.sendSuccess(
    { notifications, count: notifications.length },
    'Notifications retrieved successfully'
  );
});

// GET /api/notifications/unread-count
export const getUnreadCount = asyncHandler(async (req, res, next) => {
  const count = await Notification.countDocuments({
    recipient: req.user.id,
    read: false
  });

  res.sendSuccess(
    { unreadCount: count },
    'Unread count retrieved successfully'
  );
});

//PATCH /api/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }

  // Check if user is authorized to update this notification
  if (notification.recipient.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to update this notification', 403));
  }

  notification.read = true;
  await notification.save();

  res.sendSuccess(
    { notification },
    'Notification marked as read'
  );
});

//PATCH /api/notifications/mark-all-read
export const markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, read: false },
    { read: true }
  );

  res.sendSuccess(
    null,
    'All notifications marked as read'
  );
});

//DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }

  // Check if user is authorized to delete this notification
  if (notification.recipient.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to delete this notification', 403));
  }

  await Notification.findByIdAndDelete(req.params.id);

  res.sendSuccess(
    null,
    'Notification deleted successfully'
  );
});


//DELETE /api/notifications/delete-read
export const deleteReadNotifications = asyncHandler(async (req, res, next) => {
  await Notification.deleteMany({
    recipient: req.user.id,
    read: true
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// POST /api/notifications
export const createNotification = asyncHandler(async (req, res, next) => {
  // Only admins can create notifications for other users
  if (req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const {
    recipient,
    recipients,
    title,
    message,
    type,
    image,
    actionType,
    actionParams,
    relatedId,
    meta,
    expiresAt,
    priority
  } = req.body;

  if (!title || !message || !type) {
    return next(new AppError('title, message and type are required', 400));
  }

  // Support sending to multiple recipients
  if (Array.isArray(recipients) && recipients.length > 0) {
    const created = [];
    for (const userId of recipients) {
      const n = await sendPushNotification(
        { title, message, type, image, actionType, actionParams, relatedId, meta, expiresAt, priority },
        userId
      );
      created.push(n);
    }

    return res.sendSuccess(
      { notifications: created, count: created.length },
      'Notifications created and push sent successfully',
      201
    );
  }

  if (!recipient) {
    return next(new AppError('recipient is required', 400));
  }

  const notification = await sendPushNotification(
    { title, message, type, image, actionType, actionParams, relatedId, meta, expiresAt, priority },
    recipient
  );

  res.sendSuccess(
    { notification },
    'Notification created and push sent successfully',
    201
  );
});

// Delete expired notifications (system function) 
export const deleteExpiredNotifications = asyncHandler(async (req, res, next) => {
  // Only admins can manually trigger this
  if (req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const result = await Notification.deleteExpired();

  res.sendSuccess(
    { deletedCount: result.deletedCount },
    `${result.deletedCount} expired notifications deleted`
  );
});


 //GET /api/notifications/all
export const getAllNotifications = asyncHandler(async (req, res, next) => {
  // Only admins can view all notifications
  if (req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const notifications = await Notification.find();

  res.sendSuccess(
    { notifications, count: notifications.length },
    'All notifications retrieved successfully'
  );
});