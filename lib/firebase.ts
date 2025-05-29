"use client"

import { getApp, getApps, initializeApp } from "firebase/app"
import { getFirestore, Firestore } from "firebase/firestore"
import { getAuth, GoogleAuthProvider, OAuthProvider, Auth } from "firebase/auth"
import type { FirebaseApp } from "firebase/app"

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Log config for debugging (without sensitive values)
console.log("Firebase config loaded:", {
  apiKey: firebaseConfig.apiKey ? "present" : "missing",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
})

// Initialize Firebase app only once
let app: FirebaseApp | undefined
let firestoreDB: Firestore | undefined
let firestoreAuth: Auth | undefined
let googleProvider: GoogleAuthProvider | undefined
let microsoftProvider: OAuthProvider | undefined

// Create Google Authentication Provider
const createGoogleProvider = (): GoogleAuthProvider => {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider()
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    })
    console.log("Google Auth Provider initialized")
  }
  return googleProvider
}

// Create Microsoft Authentication Provider
const createMicrosoftProvider = (): OAuthProvider => {
  if (!microsoftProvider) {
    microsoftProvider = new OAuthProvider('microsoft.com')
    microsoftProvider.setCustomParameters({
      prompt: 'select_account'
    })
    console.log("Microsoft Auth Provider initialized")
  }
  return microsoftProvider
}

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
      console.log("Firebase initialized")
    } else {
      app = getApp()
      console.log("Firebase app already initialized")
    }
  }
  return app
}

export const getFirebaseFirestore = (): Firestore => {
  if (!firestoreDB) {
    const app = getFirebaseApp()
    firestoreDB = getFirestore(app)
    console.log("Firestore initialized")
  }
  return firestoreDB
}

export const getFirebaseAuth = (): Auth => {
  if (!firestoreAuth) {
    const app = getFirebaseApp()
    firestoreAuth = getAuth(app)
    console.log("Firebase Auth initialized")
  }
  return firestoreAuth
}

export const getGoogleAuthProvider = (): GoogleAuthProvider => {
  return createGoogleProvider()
}

export const getMicrosoftAuthProvider = (): OAuthProvider => {
  return createMicrosoftProvider()
}

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

// Initialize Analytics if in client side
if (typeof window !== "undefined") {
  getFirebaseAnalytics()
  // Initialize Firebase on client side
  getFirebaseApp()
  getFirebaseFirestore()
  getFirebaseAuth()
  createGoogleProvider()
  createMicrosoftProvider()
}

export { app, firestoreDB, firestoreAuth }
