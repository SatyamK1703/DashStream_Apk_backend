
import admin from 'firebase-admin';
import { AppError } from './appError.js';

// Function to send OTP using Firebase Admin SDK
export const firebaseSendOtp = async (phone) => {
  try {
    // This is a placeholder. You'll need to implement the actual OTP sending logic.
    // Firebase Admin SDK doesn't directly send OTPs. You need to use a client-side SDK for that.
    // This function will simulate sending an OTP for now.
    console.log(`Sending OTP to ${phone} via Firebase (simulation)`);
    return { status: 'pending' };
  } catch (error) {
    throw new AppError('Failed to send OTP via Firebase', 500);
  }
};

export const firebaseVerifyIdToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new AppError('Failed to verify Firebase ID token', 401);
  }
};
