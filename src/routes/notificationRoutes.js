
import express from 'express';
import {
  getAllNotifications,
  getUnreadCount,
  markAllAsRead,
  deleteReadNotifications,
  markAsRead,
  deleteNotification,
  createNotification,
  deleteExpiredNotifications,
  getMyNotifications
} from '../controllers/notificationController.js';
import {
  registerDeviceToken,
  deregisterDeviceToken,
  getMyDevices,
  cleanupOldTokens
} from '../controllers/deviceTokenController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { notificationSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Routes for all authenticated users
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/delete-read', deleteReadNotifications);

router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Device token routes
router.post('/register-device', validateBody(notificationSchemas.registerDeviceToken), registerDeviceToken);
router.delete('/deregister-device', deregisterDeviceToken);
router.get('/my-devices', getMyDevices);

// Admin only routes
router.use(restrictTo('admin'));

router.post('/', validateBody(notificationSchemas.createNotification), createNotification);
router.get('/all', getAllNotifications);
router.delete('/expired', deleteExpiredNotifications);
router.delete('/cleanup-tokens', cleanupOldTokens);

export default router;