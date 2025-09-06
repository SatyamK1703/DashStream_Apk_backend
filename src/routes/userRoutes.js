import express from 'express';
import {
  updateProfile,
  deleteAccount,
  updateProfessionalProfile,
  getProfessionals,
  getProfessionalDetails,
  getAllUsers,
  getUser,
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
import { protect, restrictTo } from '../controllers/authController.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import { userSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Routes for all authenticated users
router.patch('/update-profile', validateBody(userSchemas.updateProfile), updateProfile);
router.delete('/delete-account', deleteAccount);
router.post('/addresses', validateBody(userSchemas.createAddress), createAddress);
router.get('/addresses', getMyAddresses);
router.patch('/addresses/:id', validateBody(userSchemas.updateAddress), updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.patch('/addresses/:id/set-default', setDefaultAddress);

// Routes for professionals
router.patch(
  '/professional-profile',
  restrictTo('professional'),
  validateBody(userSchemas.updateProfessionalProfile),
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