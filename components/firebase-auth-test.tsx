"use client"

import { useState, useEffect } from "react"

export function FirebaseAuthTest() {
  const [status, setStatus] = useState<string>("Initializing...")
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    async function testFirebaseAuth() {
      try {
        // Log environment variables (without exposing sensitive data)
        const envVars = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Present" : "Missing",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "Missing",
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "Missing",
        }
        // console.log("Environment variables:", envVars)
        setConfig(envVars)

        // Import Firebase from your existing initialization
        const { getFirebaseAuth } = await import("@/lib/firebase")
        
        setStatus("Firebase initialized")
        
        // Get auth
        const auth = await getFirebaseAuth()
        if (!auth) {
          throw new Error("Firebase auth initialization failed")
        }
        
        setStatus("Auth initialized")

        // Try to sign in with a test account
        // This will fail with auth/invalid-credential if the credentials are wrong
        // or if email/password auth is not enabled
        try {
          const { signInWithEmailAndPassword } = await import("firebase/auth")
          await signInWithEmailAndPassword(auth, "test@example.com", "password123")
          setStatus("Sign-in successful (unexpected)")
        } catch (signInError: any) {
          // console.error("Sign-in error:", signInError)
          setError(signInError.message)
          
          // If we get auth/invalid-credential, it means Firebase is working but the credentials are wrong
          // If we get auth/operation-not-allowed, it means email/password auth is not enabled
          if (signInError.code === "auth/invalid-credential") {
            setStatus("Firebase is working correctly - invalid credentials as expected")
          } else if (signInError.code === "auth/operation-not-allowed") {
            setStatus("Email/password authentication is not enabled in Firebase Console")
          } else {
            setStatus(`Firebase error: ${signInError.code}`)
          }
        }
      } catch (err: any) {
        // console.error("Firebase test error:", err)
        setError(err.message)
        setStatus("Firebase initialization failed")
      }
    }

    testFirebaseAuth()
  }, [])

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="font-medium mb-2">Firebase Authentication Test</h3>
      <p className="mb-2">{status}</p>
      
      {config && (
        <div className="mb-2 text-sm">
          <p>Config check:</p>
          <ul className="list-disc pl-5">
            <li>API Key: {config.apiKey}</li>
            <li>Auth Domain: {config.authDomain}</li>
            <li>Project ID: {config.projectId}</li>
          </ul>
        </div>
      )}
      
      {error && (
        <div className="mt-2">
          <p className="text-red-600 font-medium">Error:</p>
          <pre className="bg-red-50 p-2 rounded text-sm overflow-auto">{error}</pre>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>This test attempts to sign in with a test account. It should fail with "auth/invalid-credential" if Firebase is working correctly.</p>
        <p className="mt-1">If you see a different error, check the Firebase Console to ensure:</p>
        <ul className="list-disc pl-5 mt-1">
          <li>Email/Password authentication is enabled</li>
          <li>Your domain is authorized</li>
          <li>Your API key has no restrictions that would block this test</li>
        </ul>
      </div>
    </div>
  )
}