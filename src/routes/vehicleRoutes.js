import express from 'express';
import {
  getMyVehicles,
  getMyDefaultVehicle,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  setDefaultVehicle,
  uploadVehicleImage,
} from '../controllers/vehicleController.js';
import { protect } from '../controllers/authController.js';
import { upload } from '../utils/cloudinary.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Vehicle CRUD operations
router.route('/')
  .get(getMyVehicles)
  .post( createVehicle);

router.get('/default', getMyDefaultVehicle);


router.route('/:id')
  .get(getVehicle)
  .patch(updateVehicle)
  .delete(deleteVehicle);

router.patch('/:id/set-default', setDefaultVehicle);
router.post('/:id/upload-image', upload.single('image'), uploadVehicleImage);


export default router;
