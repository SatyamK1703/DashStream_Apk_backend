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

const router = express.Router();

router.use(protect);

router.route('/').post(createAddress).get(getMyAddresses);
router.route('/:id').get(getAddress).patch(updateAddress).delete(deleteAddress);
router.patch('/:id/set-default', setDefaultAddress);

export default router;
