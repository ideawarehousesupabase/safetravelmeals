import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBEiSFy80A0pSK4FJ1U-2eZIyg1k6JdHyc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "safetravel-da87b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "safetravel-da87b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "safetravel-da87b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "694563735465",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:694563735465:web:509bcdc565da3901efe6b8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-68DVFZB3ZB"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Check if window is defined so analytics doesn't break SSR
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
