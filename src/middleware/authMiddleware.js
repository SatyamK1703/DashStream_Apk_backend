import User from "../models/userModel.js";
import { asyncHandler } from "./errorMiddleware.js";
import { AppError } from "../utils/appError.js";
import jwt from "jsonwebtoken";
/**
 * Middleware to protect routes - verifies JWT token and attaches user to request
 */
const protect = asyncHandler(async (req, res, next) => {
  // 1) Get token from authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) Check if user still exists (ensure 'active' is selected despite select: false)
  const currentUser = await User.findById(decoded.id).select("+active");
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  // 4) Check if user is active
  if (currentUser.active === false) {
    return next(new AppError("This user account has been deactivated.", 401));
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

//Middleware to restrict access to certain roles

const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array: ['admin', 'professional']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

const verifyOtp = asyncHandler(async (req, res, next) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return next(new AppError("Please provide phone number and OTP", 400));
  }

  // Find user with the provided phone number
  const user = await User.findOne({ phone });

  if (!user) {
    return next(new AppError("No user found with this phone number", 404));
  }

  // Check if OTP is valid and not expired
  if (!user.verifyOtp(otp)) {
    return next(new AppError("Invalid OTP or OTP has expired", 400));
  }

  // If OTP is valid, mark phone as verified
  user.isPhoneVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  req.user = user;
  next();
});

const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  req.user = currentUser;
  next();
});

export { protect, restrictTo, verifyOtp, authenticate };
