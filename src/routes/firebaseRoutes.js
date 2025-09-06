// src/routes/firebaseRoutes.js
import express from 'express';
import { authenticate as auth } from '../middleware/authMiddleware.js';
import * as firebaseController from '../controllers/firebaseController.js';

const router = express.Router();

// Authentication routes
router.post('/auth/register', firebaseController.register);
router.post('/auth/login', firebaseController.login);
router.post('/auth/reset-password', firebaseController.resetPassword);
router.post('/auth/update-profile', auth, firebaseController.updateProfile);
router.post('/auth/update-email', auth, firebaseController.updateEmail);
router.post('/auth/update-password', auth, firebaseController.updatePassword);
router.post('/auth/logout', auth, firebaseController.logout);

// Location routes
router.post('/location/update', auth, firebaseController.updateLocation);
router.post('/location/status', auth, firebaseController.updateStatus);
router.post('/location/tracking', auth, firebaseController.setTrackingEnabled);
router.post('/location/settings', auth, firebaseController.updateTrackingSettings);
router.get('/location/professional/:id', auth, firebaseController.getProfessionalLocation);
router.get('/location/professional/:id/history', auth, firebaseController.getProfessionalLocationHistory);
router.get('/location/nearby', auth, firebaseController.getNearbyProfessionals);
router.post('/location/subscribe/:professionalId', auth, firebaseController.subscribeToLocationUpdates);
router.post('/location/unsubscribe/:professionalId', auth, firebaseController.unsubscribeFromLocationUpdates);

// Notification routes
router.post('/notifications/register-device', auth, firebaseController.registerDevice);
router.post('/notifications/deregister-device', auth, firebaseController.deregisterDevice);
router.post('/notifications/send', auth, firebaseController.sendNotification);

export default router;
