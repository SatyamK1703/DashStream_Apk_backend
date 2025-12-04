/**
 * Production-Ready Authentication Middleware for DashStream
 * Consolidated authentication logic for mobile app and web
 */
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "./errorMiddleware.js";

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
export const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
    issuer: "dashstream-api",
    audience: "dashstream-app",
  });
};

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
export const signRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: "refresh" }, process.env.JWT_SECRET, {
    expiresIn: "30d", // Refresh token lasts 30 days
    issuer: "dashstream-api",
    audience: "dashstream-app",
  });
};

/**
 * Create and send JWT token response
 * @param {Object} user - User object
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {string} message - Response message
 */
export const createSendToken = (
  user,
  statusCode,
  res,
  message = "Authentication successful"
) => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Cookie options for web clients
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };

  // Set cookies for web clients
  res.cookie("jwt", token, cookieOptions);
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // Format user data for mobile app
  const userData = {
    id: user._id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage?.url || "",
    profileComplete: user.profileComplete || false,
    isPhoneVerified: user.isPhoneVerified || false,
    active: user.active !== false,
  };

  // Send response with tokens for mobile app
  res.status(statusCode).json({
    status: "success",
    message,
    data: {
      user: userData,
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
    meta: {
      tokenType: "Bearer",
      tokenExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      refreshTokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token
 */
const extractToken = (req) => {
  let token = null;

  // 1. Check Authorization header (preferred for mobile apps)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // 2. Check cookies (for web clients)
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // 3. Check x-access-token header (alternative header)
  else if (req.headers["x-access-token"]) {
    token = req.headers["x-access-token"];
  }

  return token;
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: "dashstream-api",
    audience: "dashstream-app",
  });
};

/**
 * Main authentication middleware
 * Protects routes by verifying JWT tokens
 */
export const protect = asyncHandler(async (req, res, next) => {
  // 1. Extract token from request
  const token = extractToken(req);

  console.log("🔐 Protect middleware called for:", req.path);
  console.log("🔍 Token found:", !!token);

  if (!token) {
    console.log("❌ No token provided");
    return next(
      new AppError("You are not logged in. Please log in to get access.", 401)
    );
  }

  try {
    // 2. Verify token
    const decoded = verifyToken(token);
    console.log("✅ Token decoded successfully, user ID:", decoded.id);

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.id).select("+active +email");
    if (!currentUser) {
      console.log("❌ User not found in database:", decoded.id);
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // 4. Check if user account is active
    if (currentUser.active === false) {
      console.log("❌ User account is deactivated");
      return next(
        new AppError("Your account has been deactivated. Please contact support.", 401)
      );
    }

    // Grant access to protected route
    req.user = currentUser;
    req.token = token;

    next();
  } catch (error) {
    console.log("❌ Authentication error:", error.message);
    return next(new AppError("Invalid token or authentication failed", 401));
  }
});

/**
 * Role-based access control middleware
 * @param {...string} roles - Allowed roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

/**
 * Check if user owns resource middleware
 * @param {string} userField - Field name that contains user ID (default: 'user')
 */
export const checkResourceOwnership = (userField = "user") => {
  return asyncHandler(async (req, res, next) => {
    // Allow admins to access any resource
    if (req.user.role === "admin") {
      return next();
    }

    // Check if resource belongs to the current user
    const resourceUserId =
      req.params.userId || req.body[userField] || req.resource?.[userField];

    if (
      resourceUserId &&
      resourceUserId.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("You can only access your own resources", 403));
    }

    next();
  });
};

/**
 * Logout middleware
 */
export const logout = (req, res, next) => {
  // Clear cookies
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  res.cookie("refreshToken", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = asyncHandler(async (req, res, next) => {
  // Get refresh token from cookies or body
  const { refreshToken: token } = req.cookies || req.body || {};

  if (!token || token === "loggedout") {
    return next(new AppError("No refresh token provided", 401));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError("User no longer exists", 401));
    }

    // Check if user is active
    if (currentUser.active === false) {
      return next(new AppError("User account is deactivated", 401));
    }

    // Generate new tokens
    createSendToken(currentUser, 200, res);
  } catch (error) {
    return next(new AppError("Invalid refresh token", 401));
  }
});


