import express from 'express';
import {
  createAddress,
  getMyAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/addressController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { userSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

router.use(protect);

router.route('/').post(validateBody(userSchemas.createAddress), createAddress).get(getMyAddresses);
router.route('/:id').get(getAddress).patch(validateBody(userSchemas.updateAddress), updateAddress).delete(deleteAddress);
router.patch('/:id/set-default', setDefaultAddress);

export default router;
