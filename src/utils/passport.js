import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
dotenv.config();

passport.use(
  new LocalStrategy(
    {
      usernameField: 'phone',
      passwordField: 'otp'
    },
    async (phone, otp, done) => {
      try {
     
        const user = await User.findOne({
          phone: phone,
          otp: otp,
          otpExpires: { $gt: Date.now() } 
        });
        
        if (!user) {
          return done(null, false, { message: 'Your OTP is invalid or has expired.' });
        }
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);


const jwtOptions = {
  // Extract the JWT from the 'Authorization: Bearer <TOKEN>' header.
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  // Use the secret key from environment variables to verify the token's signature.
  secretOrKey: process.env.JWT_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      const user = await User.findById(jwtPayload.id);
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
export default passport;
