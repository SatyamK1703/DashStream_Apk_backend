import express from "express";
import { protect, restrictTo } from "../middleware/auth.js";
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  getAllBookings,
  getBookingDetails,
  updateBookingStatus,
  cancelBooking,
  updateBooking,
  getAllProfessionals,
  createProfessional,
  getProfessionalById,
  getProfessionalDetails,
  verifyProfessional,
  assignProfessional,
  updateProfessional,
  updateProfessionalVerification,
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo("admin"));

// Dashboard routes
router.get("/dashboard", getDashboardStats);

// User management routes
router.route("/users").get(getAllUsers).post(createUser);

router
  .route("/users/:userId")
  .get(getUserDetails)
  .patch(updateUser)
  .delete(deleteUser);

// Booking management routes
router.route("/bookings").get(getAllBookings);
router.route("/bookings/:bookingId/status").patch(updateBookingStatus);
router.route("/bookings/:bookingId/cancel").patch(cancelBooking);

router
  .route("/bookings/:bookingId")
  .get(getBookingDetails)
  .patch(updateBooking);

// -------------------- Professionals --------------------
router.route("/professionals").get(getAllProfessionals).post(createProfessional);

router
  .route("/professionals/:professionalId")
  .get(getProfessionalById) // basic details
  .patch(updateProfessional); // update info

router
  .route("/professionals/:professionalId/details")
  .get(getProfessionalDetails); // extra detail route (if needed)

router
  .route("/professionals/:professionalId/verification")
  .patch(updateProfessionalVerification); // handle verification updates

router
  .route("/professionals/:bookingId/assign-professional")
  .patch(assignProfessional);

// -------------------- Services --------------------
router.route("/services").get(getAllServices).post(createService);

router
  .route("/services/:serviceId")
  .get(getServiceById)
  .patch(updateService)
  .delete(deleteService);

export default router;
