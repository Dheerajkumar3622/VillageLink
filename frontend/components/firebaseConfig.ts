
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// VillageLink Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA5ly1G-IcAs-We5Fl2_8YIoHgc_sPf7-A",
    authDomain: "villagelink-96b4c.firebaseapp.com",
    projectId: "villagelink-96b4c",
    storageBucket: "villagelink-96b4c.firebasestorage.app",
    messagingSenderId: "428748007277",
    appId: "1:428748007277:web:76f0eec16523044b575c64",
    measurementId: "G-TWQ8ELYRN1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
