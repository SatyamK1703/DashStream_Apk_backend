import User from "../models/userModel.js";
import { asyncHandler } from "../middleware/errorMiddleware.js";
import { AppError } from "../utils/appError.js";
import { auth } from "../config/firebase.js";
import AuthService from "../services/AuthService.js";

export const firebaseLogin = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError("ID token is required", 400));
  }

  await AuthService.verifyIdToken(idToken, res, next);
});
