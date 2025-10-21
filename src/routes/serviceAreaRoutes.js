import express from 'express';
import * as serviceAreaController from '../controllers/serviceAreaController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/check', serviceAreaController.checkServiceAvailability);

router
  .route('/')
  .get(serviceAreaController.getAllServiceAreas)
  .post(
    protect,
    restrictTo('admin'),
    serviceAreaController.createServiceArea
  );

router
  .route('/:id')
  .delete(
    protect,
    restrictTo('admin'),
    serviceAreaController.deleteServiceArea
  );

export default router;
