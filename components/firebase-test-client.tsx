"use client"

import { useEffect, useState } from "react"

export function FirebaseTest() {
  const [status, setStatus] = useState<"loading" | "initializing" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => {
    async function testFirebase() {
      try {
        setStatus("initializing")
        setDebugInfo("Starting Firebase initialization...")

        // Dynamically import Firebase
        const { firebaseApp, getFirebaseAuth } = await import("@/lib/firebase")
        
        if (!firebaseApp) {
          throw new Error("Firebase app initialization failed")
        }
        
        setDebugInfo(prev => `${prev}\nFirebase app initialized: ${!!firebaseApp}`)
        console.log("Firebase app initialized:", !!firebaseApp)
        console.log("Firebase config:", {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 5) + "...",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })

        // Test auth initialization
        const auth = await getFirebaseAuth()
        if (!auth) {
          throw new Error("Firebase auth initialization failed")
        }
        
        setDebugInfo(prev => `${prev}\nAuth initialized: ${!!auth}`)
        console.log("Auth initialized:", !!auth)

        // Instead of anonymous sign-in, let's just check if we can get the current user
        const { getAuth, onAuthStateChanged } = await import("firebase/auth")
        const currentAuth = getAuth(firebaseApp)
        
        // Set up a listener for auth state changes
        const unsubscribe = onAuthStateChanged(currentAuth, (user) => {
          console.log("Auth state changed:", user ? "User logged in" : "No user")
          setDebugInfo(prev => `${prev}\nAuth state: ${user ? "User logged in" : "No user"}`)
          
          if (user) {
            setStatus("success")
          } else {
            // If no user is logged in, we'll consider it a success for now
            // since we're just testing initialization
            setStatus("success")
          }
        }, (error) => {
          console.error("Auth state change error:", error)
          setError(error.message || "Auth state change error")
          setStatus("error")
        })

        // Clean up the listener after 5 seconds
        setTimeout(() => {
          unsubscribe()
        }, 5000)

      } catch (err: any) {
        console.error("Firebase test error:", err)
        setError(err.message || "Unknown error")
        setStatus("error")
      }
    }

    testFirebase()
  }, [])

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-medium mb-2">Firebase Test</h3>
      {status === "loading" && <p>Preparing to test Firebase...</p>}
      {status === "initializing" && <p>Initializing Firebase...</p>}
      {status === "success" && <p className="text-green-600">Firebase is initialized correctly!</p>}
      {status === "error" && (
        <div>
          <p className="text-red-600">Firebase error:</p>
          <pre className="bg-red-50 p-2 rounded text-sm overflow-auto">{error}</pre>
        </div>
      )}
      {debugInfo && (
        <div className="mt-4">
          <p className="font-medium">Debug Info:</p>
          <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
    </div>
  )
}
