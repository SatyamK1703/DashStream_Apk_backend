import express from 'express';
import {
  updateProfile,
  updateProfileImage,
  deleteAccount,
  updateProfessionalProfile,
  getProfessionals,
  getProfessionalDetails,
  getAllUsers,
  getUser,
  getCurrentUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  toggleAvailability,
  createAddress,
  updateAddress,
  deleteAddress,
  getMyAddresses,
  setDefaultAddress,
} from '../controllers/userController.js';
import { protect, restrictTo, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes that don't require authentication
router.get('/me', optionalAuth, getCurrentUser); // Allow checking auth status without requiring login

// Protect all other routes after this middleware  
router.use(protect);

// Routes for all authenticated users
router.get('/me', getCurrentUser);
router.patch('/update-profile', updateProfile);
router.patch('/update-profile-image',updateProfileImage);
router.delete('/delete-account', deleteAccount);
router.post('/addresses', createAddress);
router.get('/addresses', getMyAddresses);
router.patch('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.patch('/addresses/:id/set-default', setDefaultAddress);

// Routes for professionals
router.patch(
  '/professional-profile',
  restrictTo('professional'),
  updateProfessionalProfile
);

router.patch(
  '/toggle-availability',
  restrictTo('professional'),
  toggleAvailability
);

// Routes for customers
router.get('/professionals', getProfessionals);
router.get('/professionals/:id', getProfessionalDetails);

// Admin routes
router.use(restrictTo('admin'));

router.route('/')
  .get(getAllUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

router.get('/stats', getUserStats);


export default router;