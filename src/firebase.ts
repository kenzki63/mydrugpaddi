// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB2m0nIRMYokHESDg0YT2G_SEPYCvUskGc",
  authDomain: "mydrugpaddi.firebaseapp.com",
  projectId: "mydrugpaddi",
  storageBucket: "mydrugpaddi.firebasestorage.app",
  messagingSenderId: "46525233174",
  appId: "1:46525233174:web:b5a5a3f4ae17641adf1d37",
  measurementId: "G-XZM44C8DZY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
