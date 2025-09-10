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
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

    // 🔑 Fix private_key formatting
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    console.log("✅ Firebase Admin SDK initialized successfully");
  }
  return firebaseApp;
};

const app = initializeFirebase();

// ✅ Use modular APIs with explicit URL
const firestore = getFirestore(app);
const database = getDatabase(app, process.env.FIREBASE_DATABASE_URL);
const messaging = getMessaging(app);
const auth = getAuth(app);

export { app, initializeFirebase, firestore, database, messaging, auth, firebaseApp };


