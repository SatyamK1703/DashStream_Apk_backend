import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getProfessionalJobs,
  getJobDetails,
  updateJobStatus,
  getDashboardStats,
  getProfessionalProfile,
  updateProfessionalProfile
} from '../controllers/professionalController.js';

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Job management routes
router.get('/jobs', getProfessionalJobs);
router.get('/jobs/:jobId', getJobDetails);
router.patch('/jobs/:jobId/status', updateJobStatus);

// Dashboard and profile routes
router.get('/dashboard', getDashboardStats);
router.get('/profile', getProfessionalProfile);
router.patch('/profile', updateProfessionalProfile);

export default router;