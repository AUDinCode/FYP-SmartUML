// client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";       // 👈 Login ke liye add kiya
import { getFirestore } from "firebase/firestore"; // 👈 Database ke liye add kiya

// Aapki Asli Keys (Jo aapne bheji hain)
const firebaseConfig = {
  apiKey: "AIzaSyDbshgcRJiU1D5Cfgiy_kOyy6FQBxxbhpI",
  authDomain: "smartuml-e4aa5.firebaseapp.com",
  projectId: "smartuml-e4aa5",
  storageBucket: "smartuml-e4aa5.firebasestorage.app",
  messagingSenderId: "952935867500",
  appId: "1:952935867500:web:9680300b4c1b22d7dd6449"
};

// 1. Firebase App Initialize karna
const app = initializeApp(firebaseConfig);

// 2. Auth aur Database ko export karna taake puri app mein use ho sakein
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;