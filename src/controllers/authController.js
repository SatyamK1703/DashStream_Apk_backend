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
};

export const sendOtp = asyncHandler(async (req, res, next) => {
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
        console.error("Error in sendOtp controller:", error);
        const appError = new AppError("Could not send OTP. Please check the phone number and try again later.", 500);
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
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; // Default to India code if not provided

    const user = await User.findOne({ phone: formattedPhone });
    if (!user) {
        return next(new AppError("User not found. Please sign up first.", 404));
    }
    let verificationCheck;
    try {
        verificationCheck = await twilioVerifyOtp(formattedPhone, otp);
    } catch (err) {
        console.error("Twilio Verification API Error:", err);
        const appError = new AppError("The OTP verification service failed. Please try again.", 500);
        appError.errorCode = "APP-500-962";
        return next(appError);
    }
    
    if (!verificationCheck || verificationCheck.status !== "approved") {
        const appError = new AppError("The OTP is invalid or has expired.", 400);
        appError.errorCode = verificationCheck?.status === "expired" ? "APP-400-101" : "APP-400-100";
        return next(appError);
    }
    
    user.isPhoneVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
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

export const protect = asyncHandler(async (req, res, next) => {
    // 1) Get token from Authorization header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // 2) Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        // 4) Check if user is active
        if (!currentUser.active) {
            return next(new AppError('This user account has been deactivated.', 401));
        }

        // GRANT ACCESS TO PROTECTED ROUTE
        req.user = currentUser;
        next();
    } catch (error) {
        return next(new AppError('Invalid token. Please log in again.', 401));
    }
});

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
