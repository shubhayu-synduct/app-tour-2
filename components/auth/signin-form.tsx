"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { setSessionCookie } from "@/lib/auth-service"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { getFirebaseAuth, getFirebaseFirestore, getGoogleProvider, getMicrosoftProvider } from "@/lib/firebase"
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

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
      
      // Invalid credentials (wrong email or password)
      if (error.message.includes("invalid-credential") || error.code === "auth/invalid-credential") {
        return "Incorrect email or password. Please try again.";
      }
      
      // Wrong password
      if (error.message.includes("wrong-password") || error.code === "auth/wrong-password") {
        return "Incorrect password. Please try again.";
      }
      
      // User not found
      if (error.message.includes("user-not-found") || error.code === "auth/user-not-found") {
        return "No account found with this email. Please sign up first.";
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
      const { signInWithEmailAndPassword } = await import("firebase/auth")

      const auth = await getFirebaseAuth()
      if (!auth) {
        throw new Error("Firebase not initialized")
      }

      await signInWithEmailAndPassword(auth, email, password)
      // AuthProvider will handle the redirect based on onboarding status
      
    } catch (err: any) {
      logger.error("Error during sign in:", err)
      setError(parseFirebaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)
    
    try {
      const auth = await getFirebaseAuth()
      const googleProvider = getGoogleProvider()
      
      if (!auth || !googleProvider) {
        throw new Error("Firebase services not initialized")
      }

      const result = await signInWithPopup(auth, googleProvider)
      await setSessionCookie(result.user)
      
      // AuthProvider will handle the redirect based on onboarding status
      
    } catch (err: any) {
      logger.error("Google sign in error:", err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser')
      } else {
        setError(err.message || "An error occurred during Google sign in")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMicrosoftSignIn = async () => {
    setError("")
    setLoading(true)
    
    try {
      const auth = await getFirebaseAuth()
      const microsoftProvider = getMicrosoftProvider()
      
      if (!auth || !microsoftProvider) {
        throw new Error("Firebase services not initialized")
      }

      const result = await signInWithPopup(auth, microsoftProvider)
      await setSessionCookie(result.user)
      
      // AuthProvider will handle the redirect based on onboarding status
      
    } catch (err: any) {
      logger.error("Microsoft sign in error:", err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser')
      } else {
        setError(err.message || "An error occurred during Microsoft sign in")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
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

      <div className="flex justify-end">
        <Link 
          href="/forgot-password" 
          className="text-xs sm:text-sm text-[#223258] hover:text-[#3771FE] font-medium font-['DM_Sans']"
        >
          Forgot Password?
        </Link>
      </div>

      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Continue Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 py-2.5 sm:py-3 px-4 text-sm sm:text-base rounded-[5px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {/* Sign Up Link */}
      <div className="text-center text-sm sm:text-base">
        <span className="text-black-600 font-['DM_Sans']">Don't have an account? </span>
        <Link href="/signup" className="text-[#3771FE] hover:text-[#3771FE] font-medium font-['DM_Sans']">
          Create an account
        </Link>
      </div>

      {/* OR Divider */}
      <div className="flex items-center my-4 sm:my-6">
        <div className="flex-1 h-[1px] bg-gradient-to-r from-white to-black"></div>
        <span className="px-3 sm:px-4 text-[#000000] text-xs sm:text-sm font-['DM_Sans']">OR</span>
        <div className="flex-1 h-[1px] bg-gradient-to-l from-white to-black"></div>
      </div>

      {/* Social Sign In Buttons */}
      <div className="space-y-2 sm:space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center bg-white text-[#223258] border border-[#3771FE]/50 py-2.5 sm:py-3 px-3 sm:px-4 text-sm sm:text-base rounded-[5px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
        >
          <GoogleIcon />
          <span className="whitespace-nowrap">Sign in with Google</span>
        </button>

        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center bg-white text-[#223258] border border-[#3771FE]/50 py-2.5 sm:py-3 px-3 sm:px-4 text-sm sm:text-base rounded-[5px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
        >
          <MicrosoftIcon />
          <span className="whitespace-nowrap">Sign in with Microsoft</span>
        </button>
      </div>
    </form>
  )
}