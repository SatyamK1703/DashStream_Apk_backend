import express from 'express';
import {
  sendOtp,
  verifyOtp,
  logout,
  protect,
} from '../controllers/authController.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { authSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Public routes
router.post('/send-otp', validateBody(authSchemas.sendOtp), sendOtp);
router.post('/verify-otp', validateBody(authSchemas.verifyOtp), verifyOtp);

// Protected routes
router.use(protect);
router.post('/logout', logout);
router.get('/me', (req, res) => {
  const userData = {
    id: req.user._id,
    name: req.user.name || '',
    email: req.user.email || '',
    phone: req.user.phone,
    role: req.user.role,
    profileImage: req.user.profileImage?.url || '',
    profileComplete: req.user.profileComplete || false,
    isPhoneVerified: req.user.isPhoneVerified || false
  };

  res.status(200).json({
    status: 'success',
    data: { user: userData }
  });
});

export default router;
