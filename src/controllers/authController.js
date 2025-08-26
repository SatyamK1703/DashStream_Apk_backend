import jwt from 'jsonwebtoken';
import passport from 'passport';
import User from '../models/userModel.js';
import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import { twilioSendOtp, twilioVerifyOtp } from "../utils/twilioVerify.js";

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
    };

    res.cookie("jwt", token, cookieOptions);
    user.password = undefined; 

    res.status(statusCode).json({
        status: "success",
        token,
        data: { user },
    });
};

export const sendOtp = asyncHandler(async (req, res, next) => {
    const { phone } = req.body;

    // 1) Validate phone number
    if (!phone) {
        return next(new AppError("Phone number is required", 400));
    }
    const phoneRegex = /^\+[1-9]\d{10,14}$/; // E.164 format regex
    if (!phoneRegex.test(phone)) {
        return next(new AppError("Invalid phone number format. Must include country code (e.g., +14155552671)", 400));
    }
    let user = await User.findOne({ phone });
    if (!user) {
        user = await User.create({
            phone,
            profileComplete: false 
        });
    }
    try {
        const twilioResponse = await twilioSendOtp(phone);
        
        if (!twilioResponse || twilioResponse.status !== "pending") {
            throw new Error("Failed to send OTP. Please try again.");
        }

        res.status(200).json({
            status: "success",
            message: "OTP sent successfully.",
            phone
        });

    } catch (error) {
        console.error("Error in sendOtp controller calling Twilio:", error);
        return next(new AppError("Could not send OTP. Please check the phone number and try again later.", 500));
    }
});

export const verifyOtp = asyncHandler(async (req, res, next) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return next(new AppError("Please provide a phone number and OTP.", 400));
    }

    const user = await User.findOne({ phone });
    if (!user) {
        return next(new AppError("User not found. Please sign up first.", 404));
    }
    let verificationCheck;
    try {
        verificationCheck = await twilioVerifyOtp(phone, otp);
    } catch (err) {
        console.error("Twilio Verification API Error:", err);
        return next(new AppError("The OTP verification service failed. Please try again.", 500));
    }
    if (!verificationCheck || verificationCheck.status !== "approved") {
        return next(new AppError("The OTP is invalid or has expired.", 400));
    }
    user.isPhoneVerified = true;
    user.otp=otp;
    await user.save({ validateBeforeSave: false });
    createSendToken(user, 200, res);
});

export const logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000), 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    });

    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully.'
    });
};

export const protect = passport.authenticate('jwt', { session: false });

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError('You do not have permission to perform this action.', 403)
            );
        }
        next();
    };
};
