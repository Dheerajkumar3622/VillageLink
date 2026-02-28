import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isFirebaseInitialized = false;

export const initFirebaseAdmin = () => {
  if (isFirebaseInitialized) return;

  try {
    // Attempt to load from service-account.json if it exists
    const serviceAccountPath = path.join(__dirname, '../service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin Initialized (with service account)');
    } else {
      // Fallback to application default (works in environments like Render/GCP with variables set)
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      console.log('⚠️ Firebase Admin Initialized (Warning: No service-account.json found, using applicationDefault)');
    }
    isFirebaseInitialized = true;
  } catch (error) {
    console.error('❌ Firebase Admin Initialization Error:', error.message);
  }
};

export const getFirebaseAdmin = () => {
    if (!isFirebaseInitialized) {
        initFirebaseAdmin();
    }
    return admin;
};

export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const admin = getFirebaseAdmin();
    const payload = {
      notification: { title, body },
      data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...data
      },
      token: fcmToken
    };
    
    const response = await admin.messaging().send(payload);
    console.log(`📡 Broadcasted FCM to ${fcmToken.substring(0, 10)}... MessageID: ${response}`);
    return true;
  } catch (error) {
    console.error('❌ FCM Send Error:', error.message);
    return false;
  }
};
