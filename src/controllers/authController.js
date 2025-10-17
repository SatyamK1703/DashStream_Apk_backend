
import admin from '../config/firebaseAdmin.js';

export const verifyPhoneAuth = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).send({ message: 'ID token is required.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Optional: You can create a user in your own database here
    // or generate a session token.

    res.status(200).send({ message: 'User authenticated successfully.', uid });
  } catch (error) {
    console.error('Error verifying ID token:', error);
    res.status(401).send({ message: 'Authentication failed.', error: error.message });
  }
};
