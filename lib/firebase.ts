"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getAuth, type Auth, GoogleAuthProvider, OAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

console.log("Firebase config loaded:", {
  apiKey: firebaseConfig.apiKey ? "present" : "missing",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
})

// Declare global variables for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var __firebaseApp: FirebaseApp | undefined
  // eslint-disable-next-line no-var
  var __firebaseDB: Firestore | undefined
  // eslint-disable-next-line no-var
  var __firebaseAuth: Auth | undefined
  // eslint-disable-next-line no-var
  var __googleProvider: GoogleAuthProvider | undefined
  // eslint-disable-next-line no-var
  var __microsoftProvider: OAuthProvider | undefined
  // eslint-disable-next-line no-var
  var __authPersistenceSet: boolean | undefined
}


// Singleton getters for Firebase services
// These functions ensure that Firebase is initialized only once.
// In development, they use globalThis to persist instances across hot reloads.

function getFirebaseApp(): FirebaseApp {
  if (process.env.NODE_ENV === "development") {
    if (!globalThis.__firebaseApp) {
      console.log("Initializing Firebase app for development...")
      globalThis.__firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    }
    return globalThis.__firebaseApp
  }

  // In production, we don't need to use globalThis
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
}

export const app = getFirebaseApp()
console.log("Firebase App Initialized")

export async function getFirebaseAuth(): Promise<Auth> {
  if (globalThis.__firebaseAuth) {
    return globalThis.__firebaseAuth
  }

  const auth = getAuth(app)
  globalThis.__firebaseAuth = auth
  console.log("Firebase Auth Initialized")

  if (typeof window !== "undefined") {
    if (!globalThis.__authPersistenceSet) {
      try {
        const { setPersistence, browserLocalPersistence } = await import("firebase/auth")
        await setPersistence(auth, browserLocalPersistence)
        console.log("Firebase Auth persistence set to LOCAL (global)")
        globalThis.__authPersistenceSet = true
      } catch (error) {
        console.error("Error setting Firebase auth persistence", error)
      }
    }
  }
  return auth
}

export function getFirebaseFirestore(): Firestore {
  if (globalThis.__firebaseDB) {
    return globalThis.__firebaseDB
  }
  const db = getFirestore(app)
  globalThis.__firebaseDB = db
  console.log("Firestore Initialized")
  return db
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (globalThis.__googleProvider) {
    return globalThis.__googleProvider
  }
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  globalThis.__googleProvider = provider
  console.log("Google Auth Provider Initialized")
  return provider
}

export function getMicrosoftProvider(): OAuthProvider {
  if (globalThis.__microsoftProvider) {
    return globalThis.__microsoftProvider
  }
  const provider = new OAuthProvider('microsoft.com')
  provider.setCustomParameters({ prompt: 'select_account' })
  globalThis.__microsoftProvider = provider
  console.log("Microsoft Auth Provider Initialized")
  return provider
}

// Initialize services right away
export const firestoreAuth = getAuth(app);
export const firestoreDB = getFirestore(app);

// Initialize Analytics (only on client side)
export const getFirebaseAnalytics = async () => {
  if (typeof window === "undefined") return null
  
  try {
    const { getAnalytics } = await import("firebase/analytics")
    return getAnalytics(app)
  } catch (error) {
    console.error("Error initializing analytics:", error)
    return null
  }
}

if (typeof window !== "undefined") {
    getFirebaseAnalytics()
}
