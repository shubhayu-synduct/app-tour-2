"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { setSessionCookie } from "@/lib/auth-service"
import { AuthError } from "firebase/auth"
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { getFirebaseFirestore } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { VerificationModal } from "./verification-modal"
import { logger } from "@/lib/logger"

// Google Icon SVG component
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

// Microsoft Icon SVG component
const MicrosoftIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
    <path fill="#F25022" d="M1 1h10v10H1z"/>
    <path fill="#00A4EF" d="M13 1h10v10H13z"/>
    <path fill="#7FBA00" d="M1 13h10v10H1z"/>
    <path fill="#FFB900" d="M13 13h10v10H13z"/>
  </svg>
)

// Apple Icon SVG component
const AppleIcon = () => (
  <svg className="w-5 h-5 mr-3 text-black" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

export function SignUpForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  const parseFirebaseError = (error: any) => {
    if (!error) return "";
    
    // Handle Firebase error messages
    if (error.message) {
      // Password requirements error
      if (error.message.includes("password-does-not-meet-requirements")) {
        const requirements = error.message.match(/\[(.*?)\]/);
        if (requirements && requirements[1]) {
          return requirements[1];
        }
      }
      
      // Email already in use
      if (error.message.includes("email-already-in-use")) {
        return "This email is already registered. Please sign in or use a different email.";
      }
      
      // Invalid email
      if (error.message.includes("invalid-email")) {
        return "Please enter a valid email address.";
      }
      
      // Weak password
      if (error.message.includes("weak-password")) {
        return "Password is too weak. Please use a stronger password.";
      }
      
      // Too many requests
      if (error.message.includes("too-many-requests")) {
        return "Too many attempts. Please try again later.";
      }
      
      // Default error message - remove Firebase prefix and auth code
      return error.message
        .replace("Firebase: ", "")
        .replace(/\(auth\/.*?\)/, "")
        .trim();
    }
    
    return "An error occurred. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { getFirebaseAuth } = await import("@/lib/firebase")
      const { createUserWithEmailAndPassword, sendEmailVerification } = await import("firebase/auth")

      const auth = await getFirebaseAuth()
      if (!auth) {
        throw new Error("Firebase not initialized")
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Send email verification
      await sendEmailVerification(userCredential.user, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true
      })
      
      // Show verification modal instead of redirecting
      setShowVerificationModal(true)
    } catch (err: any) {
      logger.error("Error during sign up:", err)
      setError(parseFirebaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError("")
    setLoading(true)
    
    try {
      const { signInWithPopup } = await import("firebase/auth")
      const { doc, getDoc, setDoc } = await import("firebase/firestore")
      const { getFirebaseAuth, getFirebaseFirestore, getGoogleProvider } = await import("@/lib/firebase")

      const auth = await getFirebaseAuth()
      const googleProvider = getGoogleProvider()
      const db = await getFirebaseFirestore()
      
      if (!auth || !googleProvider || !db) {
        throw new Error("Firebase services not initialized")
      }

      const result = await signInWithPopup(auth, googleProvider)
      
      const userDocRef = doc(db, "users", result.user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        const nameArray = result.user.displayName?.split(' ') || ['User', '']
        await setDoc(userDocRef, {
          firstName: nameArray[0] || '',
          lastName: nameArray.slice(1).join(' ') || '',
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          createdAt: new Date().toISOString(),
          onboardingCompleted: false,
          providerData: 'google',
          emailVerified: result.user.emailVerified
        })
        
        // AuthProvider will handle the redirect to onboarding
      }
    } catch (err: any) {
      logger.error("Google sign up error:", err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-up was cancelled')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Sign-up popup was blocked by your browser')
      } else {
        setError(err.message || "An error occurred during Google sign up")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMicrosoftSignUp = async () => {
    setError("")
    setLoading(true)
    
    try {
      const { signInWithPopup } = await import("firebase/auth")
      const { doc, getDoc, setDoc } = await import("firebase/firestore")
      const { getFirebaseAuth, getFirebaseFirestore, getMicrosoftProvider } = await import("@/lib/firebase")

      const auth = await getFirebaseAuth()
      const microsoftProvider = getMicrosoftProvider()
      const db = await getFirebaseFirestore()
      
      if (!auth || !microsoftProvider || !db) {
        throw new Error("Firebase services not initialized")
      }

      const result = await signInWithPopup(auth, microsoftProvider)
      
      const userDocRef = doc(db, "users", result.user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        const nameArray = result.user.displayName?.split(' ') || ['User', '']
        await setDoc(userDocRef, {
          firstName: nameArray[0] || '',
          lastName: nameArray.slice(1).join(' ') || '',
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          createdAt: new Date().toISOString(),
          onboardingCompleted: false,
          providerData: 'microsoft',
          emailVerified: result.user.emailVerified
        })
        
        // AuthProvider will handle the redirect to onboarding
      }
    } catch (err: any) {
      logger.error("Microsoft sign up error:", err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-up was cancelled')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Sign-up popup was blocked by your browser')
      } else {
        setError(err.message || "An error occurred during Microsoft sign up")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form className="space-y-3 sm:space-y-4 font-['DM_Sans']" onSubmit={handleSubmit}>
        {/* Email Input */}
        <div>
          <input
            type="email"
            placeholder="Enter your email address..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-[#3771FE]/50 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent placeholder-[#8997BA] font-['DM_Sans']"
            required
          />
        </div>

        {/* Password Input */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-[#3771FE]/50 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent placeholder-[#8997BA] pr-10 sm:pr-12 font-['DM_Sans']"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
          </button>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Continue Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 py-2.5 sm:py-3 px-4 text-sm sm:text-base rounded-[5px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
        >
          {loading ? "Signing up..." : "Continue"}
        </button>

        {/* Sign In Link */}
        <div className="text-center text-sm sm:text-base">
          <span className="text-black-600 font-['DM_Sans']">Already have an account? </span>
          <Link href="/login" className="text-[#3771FE] hover:text-[#3771FE] font-medium font-['DM_Sans']">
            Sign in
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center my-4 sm:my-6">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white to-black"></div>
          <span className="px-3 sm:px-4 text-[#000000] text-xs sm:text-sm font-['DM_Sans']">OR</span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-white to-black"></div>
        </div>

        {/* Social Sign In Buttons */}
        <div className="space-y-2 sm:space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full flex items-center justify-center bg-white text-[#223258] border border-[#3771FE]/50 py-2.5 sm:py-3 px-3 sm:px-4 text-sm sm:text-base rounded-[5px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
          >
            <GoogleIcon />
            <span className="whitespace-nowrap">Sign up with Google</span>
          </button>

          <button
            type="button"
            onClick={handleMicrosoftSignUp}
            disabled={loading}
            className="w-full flex items-center justify-center bg-white text-[#223258] border border-[#3771FE]/50 py-2.5 sm:py-3 px-3 sm:px-4 text-sm sm:text-base rounded-[5px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
          >
            <MicrosoftIcon />
            <span className="whitespace-nowrap">Sign up with Microsoft</span>
          </button>
        </div>
      </form>

      {showVerificationModal && (
        <VerificationModal
          email={email}
          onClose={() => {
            setShowVerificationModal(false)
            router.push("/login")
          }}
        />
      )}
    </>
  )
}