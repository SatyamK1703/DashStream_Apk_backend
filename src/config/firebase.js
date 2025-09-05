import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

let firebaseAdmin = null;

const initializeFirebase = () => {
  if (!firebaseAdmin) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

    // 🔑 Fix private_key by converting \n to real line breaks
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin SDK initialized successfully");
  }
  return firebaseAdmin;
};

const app = initializeFirebase();

export default app;
export { initializeFirebase };
