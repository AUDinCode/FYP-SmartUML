// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 👈 Ye Import Zaroori hai

// Your web app's Firebase configuration
const firebaseConfig = {
   apiKey: "AIzaSyDbshgcRJiU1D5Cfgiy_kOyy6FQBxxbhpI",

  authDomain: "smartuml-e4aa5.firebaseapp.com",

  projectId: "smartuml-e4aa5",

  storageBucket: "smartuml-e4aa5.firebasestorage.app",

  messagingSenderId: "952935867500",

  appId: "1:952935867500:web:9680300b4c1b22d7dd6449"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Services
export const auth = getAuth(app);
export const db = getFirestore(app); // 👈 Ye Export karna lazmi hai
export default app;