
// services/firebaseConfig.ts
// HOW TO ATTACH FIREBASE:
// 1. Create a project at https://console.firebase.google.com/
// 2. Enable Authentication (Email/Pass) and Firestore/Realtime Database.
// 3. Copy config keys to .env file or replace below.
// 4. Uncomment imports in authService.ts

import { initializeApp, setLogLevel } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA5ly1G-IcAs-We5Fl2_8YIoHgc_sPf7-A",
  authDomain: "villagelink-96b4c.firebaseapp.com",
  projectId: "villagelink-96b4c",
  storageBucket: "villagelink-96b4c.firebasestorage.app",
  messagingSenderId: "428748007277",
  appId: "1:428748007277:web:76f0eec16523044b575c64",
  measurementId: "G-TWQ8ELYRN1"
};

try { setLogLevel('error'); } catch (e) {}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
