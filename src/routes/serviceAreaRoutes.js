const express = require('express');
const serviceAreaController = require('../controllers/serviceAreaController');
const authController = require('../controllers/authController');

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

module.exports = router;
