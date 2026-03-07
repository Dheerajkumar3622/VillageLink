
// services/firebaseConfig.ts
// HOW TO ATTACH FIREBASE:
// 1. Create a project at https://console.firebase.google.com/
// 2. Enable Authentication (Email/Pass) and Firestore/Realtime Database.
// 3. Copy config keys to .env file or replace below.
// 4. Uncomment imports in authService.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
