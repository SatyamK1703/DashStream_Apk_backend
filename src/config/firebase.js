import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database"; // ✅ modular API
import { getMessaging } from "firebase-admin/messaging";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

let firebaseApp = null;

const initializeFirebase = () => {
  if (!firebaseApp) {
    // Check if Firebase config is available
    if (!process.env.FIREBASE_CONFIG) {
      console.log("⚠️ Firebase config not found. Skipping Firebase initialization.");
      return null;
    }

    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

      // 🔑 Fix private_key formatting
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });

      console.log("✅ Firebase Admin SDK initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Firebase:", error.message);
      console.log("⚠️ Application will continue without Firebase services.");
      return null;
    }
  }
  return firebaseApp;
};

const app = initializeFirebase();

// ✅ Use modular APIs with explicit URL (only if app is initialized)
let firestore = null;
let database = null;
let messaging = null;
let auth = null;

if (app) {
  firestore = getFirestore(app);
  database = getDatabase(app, process.env.FIREBASE_DATABASE_URL);
  messaging = getMessaging(app);
  auth = getAuth(app);
}

export { app, initializeFirebase, firestore, database, messaging, auth, firebaseApp };


