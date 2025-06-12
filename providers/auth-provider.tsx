"use client"

import type React from "react"
import { createContext, useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { User } from "firebase/auth"
import { getSessionCookie, setSessionCookie, clearSessionCookie } from "@/lib/auth-service"
import { VerificationModal } from "@/components/auth/verification-modal"

type AuthContextType = {
  user: User | null
  loading: boolean
  showVerificationModal: boolean
  setShowVerificationModal: (show: boolean) => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  showVerificationModal: false,
  setShowVerificationModal: () => {},
})

// Global variables to persist auth state across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __authUser: User | null | undefined
  // eslint-disable-next-line no-var
  var __authLoading: boolean | undefined
  // eslint-disable-next-line no-var
  var __authListenerSetup: boolean | undefined
  // eslint-disable-next-line no-var
  var __authUnsubscribe: (() => void) | undefined
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => globalThis.__authUser ?? null)
  const [loading, setLoading] = useState<boolean>(() => globalThis.__authLoading ?? true)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const [freshSignIn, setFreshSignIn] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const logoutTimer = useRef<NodeJS.Timeout | null>(null)
  const userRef = useRef(user); // Create a ref to hold the current user
  const router = useRouter()
  const pathname = usePathname()

  // Keep the user ref updated on every render
  userRef.current = user;

  // Handle redirects in a separate useEffect
  useEffect(() => {
    if (redirectTo && redirectTo !== pathname) {
      console.log(`Executing redirect to: ${redirectTo}`)
      router.push(redirectTo)
      
      // Fallback: If router.push doesn't work within 1 second, use window.location.href
      const fallbackTimer = setTimeout(() => {
        if (window.location.pathname === pathname && pathname !== redirectTo) {
          console.log(`Router.push to ${redirectTo} didn't work, using window.location.href`)
          window.location.href = redirectTo
        }
      }, 1000)
      
      // Clear the redirect after attempting
      setRedirectTo(null)
      
      return () => clearTimeout(fallbackTimer)
    }
  }, [redirectTo, pathname, router])

  // Sync local state with global state
  useEffect(() => {
    globalThis.__authUser = user
    globalThis.__authLoading = loading
  }, [user, loading])

  useEffect(() => {
    if (typeof window === "undefined") return

    // If auth listener is already set up, don't set it up again
    if (globalThis.__authListenerSetup) {
      console.log("Auth listener already set up, skipping setup.")
      // Sync with global state if it exists
      if (globalThis.__authUser !== undefined) {
        setUser(globalThis.__authUser)
      }
      if (globalThis.__authLoading !== undefined) {
        setLoading(globalThis.__authLoading)
      }
      return
    }

    console.log("Setting up new auth listener...")
    let mounted = true
    let initialLoad = true
    
    const initializeAuth = async () => {
      try {
        const { getFirebaseAuth } = await import("@/lib/firebase")
        const { onAuthStateChanged } = await import("firebase/auth")

        const auth = await getFirebaseAuth()
        if (!auth) {
          console.error("Auth not initialized")
          if (mounted) setLoading(false)
          return
        }

        const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!mounted) return
          
          // If a user is detected, it's a login or session restoration.
          // Clear any pending logout timer.
          if (user) {
            if (logoutTimer.current) {
              console.log("Fast Refresh detected: Cancelling pending logout.")
              clearTimeout(logoutTimer.current)
              logoutTimer.current = null
            }
            
            console.log(`Auth state changed: User logged in (ID: ${user.uid})`)
            globalThis.__authUser = user
            setUser(user)
            
            // Only mark as fresh sign-in if this is NOT the initial load
            if (!initialLoad) {
              console.log("Fresh sign-in detected")
              setFreshSignIn(true)
            } else {
              console.log("Session restored from existing auth")
            }
            
            const currentSession = getSessionCookie()
            if (!currentSession || currentSession.uid !== user.uid) {
              await setSessionCookie(user)
            }
          } else {
            // If user is null, it could be a real logout or a Fast Refresh blip.
            // Don't act immediately. Set a timer.
            console.log("Auth state changed: User logged out event received. Starting timer...")
            logoutTimer.current = setTimeout(() => {
              console.log("Timer finished. Executing logout.")
              globalThis.__authUser = null
              setUser(null)
              clearSessionCookie()
              logoutTimer.current = null
              setFreshSignIn(false) // Reset fresh sign-in flag on logout
            }, 3000) // Increased debounce delay to 3 seconds to handle cross-tab operations
          }
          
          globalThis.__authLoading = false
          setLoading(false)
          initialLoad = false // Mark that initial load is complete
        }, (error) => {
          console.error("Auth state change error:", error)
          if (mounted) {
            globalThis.__authLoading = false
            setLoading(false)
          }
        })

        globalThis.__authListenerSetup = true
        globalThis.__authUnsubscribe = authUnsubscribe
        console.log("Auth listener set up globally.")

      } catch (error) {
        console.error("Error setting up auth state listener:", error)
        if (mounted) {
            globalThis.__authLoading = false
            setLoading(false)
        }
      }
    }

    initializeAuth()
    
    return () => {
      mounted = false
      // We don't unsubscribe on component unmount anymore to persist across hot reloads.
      // The listener will live for the entire session.
    }
  }, [])

  // Protected routes and cross-tab sync remain the same
  // ... (keeping existing logic for protected routes and storage events) ...
  
  // Cross-tab auth sync effect
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth-sync" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue)
          const currentUser = userRef.current // Use the ref to get the LATEST user state

          // A logout happened in another tab. If we are logged in, we must sync.
          if (data.action === "logout" && currentUser) {
            console.log("Cross-tab logout detected. Reloading to sync state.")
            window.location.reload()
            return
          }
  
          // A login happened in another tab.
          if (data.action === "login") {
            // If we are logged out OR logged in as a different user, we must sync.
            if (!currentUser || (currentUser && currentUser.uid !== data.uid)) {
              console.log("Cross-tab login/user-switch detected. Reloading to sync state.")
              window.location.reload()
              return
            }
          }
          // Otherwise, the event is for the same logged-in user, so we do nothing.

        } catch (error) {
          console.error("Error handling cross-tab auth sync:", error)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, []) // Empty dependency array is now safe because we use a ref

  // Protected routes check
  useEffect(() => {
    if (loading) return // Don't redirect while loading
    
    console.log("Protected routes check:", { user: user?.uid, loading, pathname, freshSignIn })

    const isPublicRoute = ['/login', '/signup', '/'].includes(pathname)

    // If not authenticated and trying to access protected route
    if (!user && !isPublicRoute) {
      console.log("Redirecting to login from:", pathname)
      setRedirectTo('/login')
      return
    }

    // If user is authenticated but email not verified (and using email/password auth), show verification modal
    // Skip verification modal if coming from email verification process
    const isEmailVerificationRoute = pathname === '/verify-email' || pathname.includes('verify-email')
    if (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password') && !isPublicRoute && !isEmailVerificationRoute) {
      console.log("User email not verified, showing verification modal")
      setShowVerificationModal(true)
      return
    }

    // If authenticated and on auth pages, redirect to appropriate page
    if (user && (pathname === '/login' || pathname === '/signup')) {
      if (freshSignIn) {
        console.log("Fresh sign-in detected on auth page, checking onboarding status...")
        setFreshSignIn(false) // Reset the flag
      } else {
        console.log("User is authenticated (session restored), redirecting from auth page...")
      }
      checkUserOnboardingAndRedirect(user)
      return
    }

    // Only check onboarding status for specific entry points, not all protected routes
    // This prevents redirecting users away from pages they're trying to access
    const shouldCheckOnboarding = user && (
      pathname === '/' || // Root path
      pathname === '/onboarding' // If they're accessing onboarding directly
    )

    if (shouldCheckOnboarding) {
      console.log("Checking onboarding status for entry point:", pathname)
      checkUserOnboardingAndRedirect(user)
    }
  }, [user, loading, pathname, freshSignIn, router])

  // Function to check user onboarding status and redirect accordingly
  const checkUserOnboardingAndRedirect = async (user: User) => {
    console.log("checkUserOnboardingAndRedirect called for user:", user.uid)
    
    // First check if email is verified for email/password users
    if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
      console.log("Email not verified for email/password user, showing verification modal")
      setShowVerificationModal(true)
      return
    }
    
    try {
      const { getFirebaseFirestore } = await import("@/lib/firebase")
      const { doc, getDoc } = await import("firebase/firestore")
      
      const db = await getFirebaseFirestore()
      if (!db) {
        console.error("Firestore not available")
        return
      }
      
      console.log("Fetching user document for:", user.uid)
      const userDoc = await getDoc(doc(db, "users", user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log("User document found:", userData)
        if (userData?.onboardingCompleted) {
          console.log("User onboarding completed, setting redirect to dashboard")
          setRedirectTo('/dashboard')
        } else {
          console.log("User onboarding not completed, setting redirect to onboarding")
          setRedirectTo('/onboarding')
        }
      } else {
        console.log("User document does not exist, creating new user and setting redirect to onboarding")
        
        // Create user document for new users
        const { setDoc } = await import("firebase/firestore")
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        
        console.log("New user document created, setting redirect to onboarding")
        setRedirectTo('/onboarding')
      }
    } catch (error) {
      console.error("Error checking user onboarding status:", error)
      // Default to dashboard on error
      //console.log("Error occurred, setting redirect to dashboard")
      //setRedirectTo('/dashboard')
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, showVerificationModal, setShowVerificationModal }}>
      {children}
      {showVerificationModal && user?.email && (
        <VerificationModal
          email={user.email}
          onClose={() => setShowVerificationModal(false)}
          redirectToLogin={false}
        />
      )}
    </AuthContext.Provider>
  )
}
