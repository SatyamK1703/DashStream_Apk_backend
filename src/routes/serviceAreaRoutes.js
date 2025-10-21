import express from 'express';
import * as serviceAreaController from '../controllers/serviceAreaController.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.get('/check', serviceAreaController.checkServiceAvailability);

router
  .route('/')
  .get(serviceAreaController.getAllServiceAreas)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    serviceAreaController.createServiceArea
  );

router
  .route('/:id')
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    serviceAreaController.deleteServiceArea
  );

export default router;
