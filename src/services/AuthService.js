import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import { firebaseVerifyIdToken } from "../utils/firebaseAuth.js";


class AuthService {

  //Generate JWT token
  static signToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  }

 //Create and send JWT token in response

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

  static verifyIdToken = asyncHandler(async (idToken, res, next) => {

    if (!idToken) {
      return next(new AppError("Please provide an ID token.", 400));
    }

    try {
      const decodedToken = await firebaseVerifyIdToken(idToken);
      const { phone_number } = decodedToken;

      let user = await User.findOne({ phone: phone_number });

      if (!user) {
        user = await User.create({
          phone: phone_number,
          isPhoneVerified: true,
          profileComplete: false,
        });
      } else {
        user.isPhoneVerified = true;
        await user.save({ validateBeforeSave: false });
      }

      AuthService.createSendToken(user, 200, res);
    } catch (error) {
      console.error("Error in verifyIdToken:", error);
      return next(new AppError("Could not verify ID token. Please try again.", 500));
    }
  });
  

}

export default AuthService;