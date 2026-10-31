import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBEiSFy80A0pSK4FJ1U-2eZIyg1k6JdHyc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "safetravel-da87b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "safetravel-da87b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "safetravel-da87b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "694563735465",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:694563735465:web:509bcdc565da3901efe6b8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-68DVFZB3ZB"
};

// `vite --mode emulator` (npm run dev:emulator) points the app at the local Firebase emulators.
export const usingEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Optional fields are left out of documents rather than rejected.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

if (usingEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
}

// Analytics only in a real browser against the live project.
export const analytics =
  typeof window !== "undefined" && !usingEmulators ? isSupported().then((ok) => (ok ? getAnalytics(app) : null)) : null;
