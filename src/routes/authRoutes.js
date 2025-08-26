import express from 'express';
import {
  sendOtp,
  verifyOtp,
  logout,
  protect,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

router.use(protect);
router.post('/logout', logout);

export default router;
