/**
 * Firebase Admin SDK initialization
 */
import admin from 'firebase-admin';
import serviceAccount from './firebaseServiceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin SDK if it hasn't been initialized yet
let firebaseAdmin = null;

const initializeFirebase = () => {
  if (!firebaseAdmin) {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  }
  return firebaseAdmin;
};

// Initialize Firebase on module import
const app = initializeFirebase();

export default app;
export { initializeFirebase };