import User from "../models/userModel.js";
import { asyncHandler } from "../middleware/errorMiddleware.js";
import { AppError } from "../utils/appError.js";
import { twilioSendOtp, twilioVerifyOtp } from "../utils/twilioVerify.js";
import { createSendToken } from "../middleware/auth.js";

export const sendOtp = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  // 1) Validate phone number
  if (!phone) {
    return next(new AppError("Phone number is required", 400));
  }

  // Allow both formats: with or without country code for better compatibility with React Native app
  const phoneRegex = /^(\+[1-9]\d{10,14}|[0-9]{10})$/;
  if (!phoneRegex.test(phone)) {
    return next(
      new AppError(
        "Invalid phone number format. Please provide a valid phone number",
        400
      )
    );
  }

  // Format phone number if needed
  const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`; // Default to India code if not provided

  // Check if user exists, create if not
  let user = await User.findOne({ phone: formattedPhone });
  if (!user) {
    user = await User.create({
      phone: formattedPhone,
      profileComplete: false,
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
      phone: formattedPhone,
    });
  } catch (error) {
    console.error("Error in sendOtp controller:", error);
    const appError = new AppError(
      "Could not send OTP. Please check the phone number and try again later.",
      500
    );
    appError.errorCode = "APP-500-962";
    return next(appError);
  }
});

export const verifyOtp = asyncHandler(async (req, res, next) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return next(new AppError("Please provide a phone number and OTP.", 400));
  }

  // Format phone number if needed
  const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`; // Default to India code if not provided

  const user = await User.findOne({ phone: formattedPhone });
  if (!user) {
    return next(new AppError("User not found. Please sign up first.", 404));
  }
  let verificationCheck;
  try {
    verificationCheck = await twilioVerifyOtp(formattedPhone, otp);
  } catch (err) {
    console.error("Twilio Verification API Error:", err);

    // Handle specific Twilio errors
    if (err.code === 20404) {
      const appError = new AppError(
        "No pending verification found for this phone number. Please request a new OTP.",
        400
      );
      appError.errorCode = "APP-400-102";
      return next(appError);
    } else if (err.code === 60200) {
      const appError = new AppError(
        "The OTP is invalid. Please check and try again.",
        400
      );
      appError.errorCode = "APP-400-100";
      return next(appError);
    } else if (err.code === 60202) {
      const appError = new AppError(
        "The OTP has expired. Please request a new one.",
        400
      );
      appError.errorCode = "APP-400-101";
      return next(appError);
    } else {
      const appError = new AppError(
        `OTP verification failed: ${err.message}`,
        500
      );
      appError.errorCode = "APP-500-962";
      return next(appError);
    }
  }

  if (!verificationCheck || verificationCheck.status !== "approved") {
    const appError = new AppError("The OTP is invalid or has expired.", 400);
    appError.errorCode =
      verificationCheck?.status === "expired" ? "APP-400-101" : "APP-400-100";
    return next(appError);
  }

  user.isPhoneVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });
  createSendToken(
    user,
    200,
    res,
    "OTP verified successfully. Welcome to DashStream!"
  );
});
