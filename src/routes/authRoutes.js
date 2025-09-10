import express from 'express';
import {
  sendOtp,
  verifyOtp
} from '../controllers/authController.js';
import { protect, logout, refreshToken } from '../middleware/auth.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { authSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Public routes
router.post('/send-otp', validateBody(authSchemas.sendOtp), sendOtp);
router.post('/verify-otp', validateBody(authSchemas.verifyOtp), verifyOtp);
router.post('/refresh-token', refreshToken);

// Health check for authentication service
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authentication service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Protected routes
router.use(protect);

// Logout
router.post('/logout', logout);

// Get current user info
router.get('/me', (req, res) => {
  const userData = {
    id: req.user._id,
    name: req.user.name || '',
    email: req.user.email || '',
    phone: req.user.phone,
    role: req.user.role,
    profileImage: req.user.profileImage?.url || '',
    profileComplete: req.user.profileComplete || false,
    isPhoneVerified: req.user.isPhoneVerified || false,
    lastActive: req.user.lastActive,
    addresses: req.user.addresses || []
  };

  res.status(200).json({
    status: 'success',
    message: 'User data retrieved successfully',
    data: { user: userData },
    meta: {
      requestTime: new Date().toISOString()
    }
  });
});

// Check token validity
router.get('/verify-token', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Token is valid',
    data: {
      userId: req.user._id,
      role: req.user.role,
      tokenValid: true
    }
  });
});

export default router;
