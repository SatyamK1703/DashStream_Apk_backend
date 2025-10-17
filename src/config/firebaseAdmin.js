
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(__dirname, './serviceAccountKey.json');
    const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountFile);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error);
    if (error.code === 'ENOENT') {
      console.error('Please make sure your service account key file is named "serviceAccountKey.json" and is located in the "src/config" directory.');
    }
    process.exit(1);
  }
}

const app = admin.app();
const firestore = getFirestore(app);
const database = getDatabase(app);
const messaging = getMessaging(app);
const auth = getAuth(app);

export { app, firestore, database, messaging, auth };
export default admin; // Export default for compatibility with existing code
