
import express from 'express';
import { verifyPhoneAuth } from '../controllers/authController.js';

const router = express.Router();

router.post('/verify-phone', verifyPhoneAuth);

// You can add other auth-related routes here if needed

export default router;
