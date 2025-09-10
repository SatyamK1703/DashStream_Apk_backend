import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
console.log('Twilio Client Initialized:', client ? 'Success' : 'Failed');

export const twilioSendOtp = async (phone) => {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: 'sms'
      });
    return verification;
  } catch (error) {
    console.error('Twilio Send OTP Error:', error);
    throw error;
  }
};

export const twilioVerifyOtp = async (phone, code) => {
  try {
    const verification_check = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code: code
      });
    return verification_check;
  } catch (error) {
    console.error('Twilio Verify OTP Error:', error);
    throw error;
  }
};


// import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
// import { initializeApp } from "firebase/app";

// const firebaseConfig = {
//   apiKey: "AIzaSyCEaEMoHyuy9hA-c2MsTkMA9nH4190DZfg",
//   authDomain: "dashsteam-9c39b.firebaseapp.com",
//   databaseURL: "https://dashsteam-9c39b-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "dashsteam-9c39b",
//   storageBucket: "dashsteam-9c39b.firebasestorage.app",
//   messagingSenderId: "288888418685",
//   appId: "1:288888418685:web:ffa578114358d30210dc14",
//   measurementId: "G-E98JRPEYKW"
// };

// // Init Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);

// // Setup reCAPTCHA
// export function setupRecaptcha() {
//   if (!window.recaptchaVerifier) {
//     window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {}, auth);
//   }
// }

// // Send OTP
// export async function firebaseSendOtp(phone) {
//   setupRecaptcha();
//   const appVerifier = window.recaptchaVerifier;
//   return await signInWithPhoneNumber(auth, phone, appVerifier);
// }

// // Verify OTP
// export async function firebaseVerifyOtp(confirmationResult, otp) {
//   const userCredential = await confirmationResult.confirm(otp);
//   return userCredential.user; // Firebase user object
// }
