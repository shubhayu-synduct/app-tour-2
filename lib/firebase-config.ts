import { initializeApp, getApps, getApp } from "firebase/app"

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDkqGSpF6YN7k1dJlXrWy6Qei7XtBjcmQQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "synduct-1a5dd.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "synduct-1a5dd",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "synduct-1a5dd.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "276866709512",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:276866709512:web:51c160733e2d0641b1f9bd",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-SYSKG3VCK4"
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export default app
