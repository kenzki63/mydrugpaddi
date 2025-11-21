// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyB2m0nIRMYokHESDg0YT2G_SEPYCvUskGc",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "mydrugpaddi.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "mydrugpaddi",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "mydrugpaddi.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "46525233174",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:46525233174:web:b5a5a3f4ae17641adf1d37",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-XZM44C8DZY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;