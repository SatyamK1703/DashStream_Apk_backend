
import express from 'express';
import {getAllNotifications,getUnreadCount,markAllAsRead,deleteReadNotifications,markAsRead,deleteNotification,createNotification,deleteExpiredNotifications,getMyNotifications} from '../controllers/notificationController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

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

// Admin only routes
router.use(restrictTo('admin'));

router.post('/', createNotification);
router.get('/all', getAllNotifications);
router.delete('/expired', deleteExpiredNotifications);

export default router;