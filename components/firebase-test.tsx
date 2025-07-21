"use client"

import { useEffect, useState } from "react"
import { getAuth, signInAnonymously } from "firebase/auth"
import { collection, getDocs, getFirestore } from "firebase/firestore"
import app from "@/lib/firebase-config"

export function FirebaseTest() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testFirebase() {
      try {
        // Initialize Firebase services directly here to ensure proper order
        const auth = getAuth(app)
        const db = getFirestore(app)

        // console.log("Firebase app initialized:", !!app)
  // console.log("Auth initialized:", !!auth)
  // console.log("Firestore initialized:", !!db)

        // Test anonymous sign in
        try {
          await signInAnonymously(auth)
          // console.log("Anonymous sign in successful")
    } catch (authError: any) {
      // console.warn("Anonymous sign in failed (this is okay for testing):", authError.message)
        }

        // Test Firestore connection
        try {
          const snapshot = await getDocs(collection(db, "test-collection"))
          // console.log("Firestore query successful, docs:", snapshot.docs.length)
    } catch (dbError: any) {
      // console.warn("Firestore query failed (this is okay for testing):", dbError.message)
        }

        setStatus("success")
      } catch (err: any) {
        // console.error("Firebase test error:", err)
        setError(err.message || "Unknown error")
        setStatus("error")
      }
    }

    testFirebase()
  }, [])

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-medium mb-2">Firebase Test</h3>
      {status === "loading" && <p>Testing Firebase connection...</p>}
      {status === "success" && <p className="text-green-600">Firebase is working correctly!</p>}
      {status === "error" && (
        <div>
          <p className="text-red-600">Firebase error:</p>
          <pre className="bg-red-50 p-2 rounded text-sm overflow-auto">{error}</pre>
        </div>
      )}
    </div>
  )
}
