"use client"

import type React from "react"
import { createContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { User } from "firebase/auth"
import { getSessionCookie, setSessionCookie, clearSessionCookie } from "@/lib/auth-service"

type AuthContextType = {
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    const initializeAuth = async () => {
      try {
        // Dynamically import Firebase auth
        const { getFirebaseAuth } = await import("@/lib/firebase")
        const { onAuthStateChanged, setPersistence, browserLocalPersistence } = await import("firebase/auth")

        // Get auth instance
        const auth = await getFirebaseAuth()
        if (!auth) {
          console.error("Auth not initialized")
          setLoading(false)
          return
        }

        // Set persistence to LOCAL to ensure the auth state persists
        await setPersistence(auth, browserLocalPersistence)

        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log("Auth state changed:", user ? "User logged in" : "User logged out")
          console.log("User ID:", user?.uid)
          
          // Set our user state
          setUser(user)
          
          // Sync with our custom session cookie
          if (user) {
            setSessionCookie(user)
            
            // Create user document if it doesn't exist
            try {
              const { getFirebaseFirestore } = await import("@/lib/firebase")
              const { doc, getDoc, setDoc } = await import("firebase/firestore")
              
              const db = await getFirebaseFirestore()
              if (!db) {
                console.error("Firestore not initialized")
                return
              }
              
              const userDocRef = doc(db, "users", user.uid)
              const userDoc = await getDoc(userDocRef)
              
              if (!userDoc.exists()) {
                // Create new user document with basic info
                await setDoc(userDocRef, {
                  email: user.email,
                  emailVerified: user.emailVerified,
                  displayName: user.displayName || "",
                  onboardingCompleted: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                })
                console.log("Created new user document for:", user.uid)
              }
            } catch (error) {
              console.error("Error creating user document:", error)
            }
          } else {
            clearSessionCookie()
          }
          
          setLoading(false)
        })

        return () => unsubscribe()
      } catch (error) {
        console.error("Error setting up auth state listener:", error)
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Handle protected routes
  useEffect(() => {
    if (!loading) {
      console.log("Auth state in protected routes check:", { user, pathname, loading })
      
      // Define public routes
      const publicRoutes = [
        "/", 
        "/login", 
        "/signup", 
        "/forgot-password",
        "/reset-password"
      ]
      const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith("/reset-password")
      
      // If user is not authenticated and trying to access a protected route, redirect to login
      if (!user && !isPublicRoute) {
        console.log("User not authenticated, redirecting to login from:", pathname)
        router.push("/login")
        return
      }
      
      // If user is authenticated, check if they need to complete onboarding
      if (user) {
        // Check if user has completed onboarding and email is verified
        const checkUserStatus = async () => {
          try {
            // Dynamically import Firebase modules
            const { getFirebaseFirestore } = await import("@/lib/firebase")
            const { doc, getDoc } = await import("firebase/firestore")
            
            // Get Firestore
            const db = await getFirebaseFirestore()
            if (!db) {
              console.error("Firestore not initialized")
              return
            }
            
            // Get user document
            const userDoc = await getDoc(doc(db, "users", user.uid))
            const userData = userDoc.data()
            
            console.log("User status:", { 
              onboardingCompleted: userData?.onboardingCompleted,
              emailVerified: user.emailVerified 
            })
            
            // If email is not verified and not on signup page, redirect to login
            if (!user.emailVerified && pathname !== "/signup") {
              console.log("Email not verified, redirecting to login")
              router.push("/login?error=email-not-verified")
              return
            }
            
            // If user has not completed onboarding and is not on the onboarding page, redirect to onboarding
            if (!userData?.onboardingCompleted && pathname !== "/onboarding" && user.emailVerified) {
              console.log("User has not completed onboarding, redirecting to onboarding")
              router.push("/onboarding")
              return
            }
            
            // If user has completed onboarding and is on the onboarding page, redirect to dashboard
            if (userData?.onboardingCompleted && pathname === "/onboarding") {
              console.log("User has completed onboarding, redirecting to dashboard")
              router.push("/dashboard")
              return
            }
          } catch (error) {
            console.error("Error checking user status:", error)
          }
        }
        
        checkUserStatus()
      }
    }
  }, [user, loading, pathname, router])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}
