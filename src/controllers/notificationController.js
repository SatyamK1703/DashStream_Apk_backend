
import { asyncHandler } from '../middleware/errorMiddleware.js';
import AppError from '../utils/appError.js';
import Notification from '../models/notificationModel.js';
import { sendPushNotification } from '../services/notificationService.js';


/**
 * Get all notifications for the current user
 * @route GET /api/notifications
 */
export const getMyNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort('-createdAt');

  res.sendSuccess(
    { notifications, count: notifications.length },
    'Notifications retrieved successfully'
  );
});

/**
 * Get unread notifications count for the current user
 * @route GET /api/notifications/unread-count
 */
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

/**
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 */
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

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/mark-all-read
 */
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

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 */
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

/**
 * Delete all read notifications
 * @route DELETE /api/notifications/delete-read
 */
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

/**
 * Create a notification (admin only)
 * @route POST /api/notifications
 */
export const createNotification = asyncHandler(async (req, res, next) => {
  // Only admins can create notifications for other users
  if (req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const newNotification = await Notification.create(req.body);

  res.sendSuccess(
    { notification: newNotification },
    'Notification created successfully',
    201
  );
});

/**
 * Delete expired notifications (system function)
 * This would typically be called by a scheduled job
 */
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

/**
 * Get all notifications (admin only)
 * @route GET /api/notifications/all
 */
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