import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import { twilioSendOtp, twilioVerifyOtp } from "../utils/twilioVerify.js";

/**
 * AuthService - Authentication service that handles Twilio OTP authentication
 * This service consolidates authentication functionality from authController.js
 */
class AuthService {
  /**
   * Generate JWT token
   * @param {string} id - User ID
   * @returns {string} JWT token
   */
  static signToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  }

  /**
   * Create and send JWT token in response
   * @param {Object} user - User object
   * @param {number} statusCode - HTTP status code
   * @param {Object} res - Express response object
   */
  static createSendToken(user, statusCode, res) {
    const token = this.signToken(user._id);

    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    res.cookie("jwt", token, cookieOptions);
    
    // Format user data for React Native app
    const userData = {
      id: user._id,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage?.url || '',
      profileComplete: user.profileComplete || false,
      isPhoneVerified: user.isPhoneVerified || false
    };

    res.status(statusCode).json({
      status: "success",
      token,
      data: { user: userData },
    });
  }

  /**
   * Send OTP via Twilio
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static sendOtp = asyncHandler(async (req, res, next) => {
    const { phone } = req.body;

    // 1) Validate phone number
    if (!phone) {
      return next(new AppError("Phone number is required", 400));
    }
    
    // Allow both formats: with or without country code for better compatibility with React Native app
    const phoneRegex = /^(\+[1-9]\d{10,14}|[0-9]{10})$/;
    if (!phoneRegex.test(phone)) {
      return next(new AppError("Invalid phone number format. Please provide a valid phone number", 400));
    }
    
    // Format phone number if needed
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; // Default to India code if not provided
    
    // Check if user exists, create if not
    let user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      user = await User.create({
        phone: formattedPhone,
        profileComplete: false 
      });
    }
    
    try {
      const twilioResponse = await twilioSendOtp(formattedPhone);
      
      if (!twilioResponse || twilioResponse.status !== "pending") {
        throw new Error("Failed to send OTP. Please try again.");
      }

      res.status(200).json({
        status: "success",
        message: "OTP sent successfully.",
        phone: formattedPhone
      });

    } catch (error) {
      console.error("Error in sendOtp:", error);
      return next(new AppError("Could not send OTP. Please check the phone number and try again later.", 500));
    }
  });

  /**
   * Verify OTP sent via Twilio
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static verifyOtp = asyncHandler(async (req, res, next) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return next(new AppError("Please provide a phone number and OTP.", 400));
    }
    
    // Format phone number if needed
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; // Default to India code if not provided

    const user = await User.findOne({ phone: formattedPhone });
    
    if (!user) {
      return next(new AppError("User not found with this phone number.", 404));
    }

    try {
      const twilioResponse = await twilioVerifyOtp(formattedPhone, otp);
      
      if (!twilioResponse || twilioResponse.status !== "approved") {
        return next(new AppError("Invalid OTP. Please try again.", 400));
      }

      // Mark phone as verified
      user.isPhoneVerified = true;
      await user.save({ validateBeforeSave: false });

      // Create and send token
      AuthService.createSendToken(user, 200, res);

    } catch (error) {
      console.error("Error in verifyOtp:", error);
      return next(new AppError("Could not verify OTP. Please try again.", 500));
    }
  });
  

}

export default AuthService;