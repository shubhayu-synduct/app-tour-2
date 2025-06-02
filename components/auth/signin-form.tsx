"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { setSessionCookie } from "@/lib/auth-service"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { getFirebaseAuth, getFirebaseFirestore, getGoogleAuthProvider, getMicrosoftAuthProvider } from "@/lib/firebase"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const auth = getFirebaseAuth()
      if (!auth) {
        throw new Error("Firebase auth not initialized")
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await setSessionCookie(userCredential.user)
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Error during signin:", err)
      setError(err.message || "An error occurred during sign in")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)
    
    try {
      const auth = getFirebaseAuth()
      const googleProvider = getGoogleAuthProvider()
      const db = getFirebaseFirestore()
      
      if (!auth || !googleProvider || !db) {
        throw new Error("Firebase services not initialized")
      }

      const result = await signInWithPopup(auth, googleProvider)
      await setSessionCookie(result.user)
      
      const userDocRef = doc(db, "users", result.user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        router.push(userData?.onboardingCompleted ? "/dashboard" : "/onboarding")
      } else {
        router.push("/onboarding")
      }
    } catch (err: any) {
      console.error("Google sign in error:", err)
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
      const auth = getFirebaseAuth()
      const microsoftProvider = getMicrosoftAuthProvider()
      const db = getFirebaseFirestore()
      
      if (!auth || !microsoftProvider || !db) {
        throw new Error("Firebase services not initialized")
      }

      const result = await signInWithPopup(auth, microsoftProvider)
      await setSessionCookie(result.user)
      
      const userDocRef = doc(db, "users", result.user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        router.push(userData?.onboardingCompleted ? "/dashboard" : "/onboarding")
      } else {
        router.push("/onboarding")
      }
    } catch (err: any) {
      console.error("Microsoft sign in error:", err)
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
    <form className="space-y-4 font-['DM_Sans']" onSubmit={handleSubmit}>
      {/* Email Input */}
      <div>
        <input
          type="email"
          placeholder="Enter your email address..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-[#3771FE]/50 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent placeholder-[#8997BA] font-['DM_Sans']"
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
          className="w-full px-4 py-3 border border-[#3771FE]/50 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent placeholder-[#8997BA] pr-12 font-['DM_Sans']"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <div className="flex justify-end">
        <Link 
          href="/forgot-password" 
          className="text-sm text-[#223258] hover:text-[#223258] font-medium font-['DM_Sans']"
        >
          Forgot Password?
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-[10px] font-['DM_Sans']">{error}</div>}

      {/* Continue Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 py-3 px-4 rounded-[10px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {/* Sign Up Link */}
      <div className="text-center">
        <span className="text-black-600 font-['DM_Sans']">Don't have an account? </span>
        <Link href="/signup" className="text-[#3771FE] hover:text-[#3771FE] font-medium font-['DM_Sans']">
          Create an account
        </Link>
      </div>

      {/* OR Divider */}
      <div className="flex items-center my-6">
        <div className="flex-1 h-[1px] bg-gradient-to-r from-white to-black"></div>
        <span className="px-4 text-[#000000] text-sm font-['DM_Sans']">OR</span>
        <div className="flex-1 h-[1px] bg-gradient-to-l from-white to-black"></div>
      </div>

      {/* Social Sign In Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center bg-white text-[#223258] border border-[#3771FE]/50 py-3 px-4 rounded-[10px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center bg-white text-[#223258] border border-[#3771FE]/50 py-3 px-4 rounded-[10px] hover:bg-[#C6D7FF]/50 transition duration-200 font-medium disabled:opacity-70 font-['DM_Sans']"
        >
          <MicrosoftIcon />
          Sign in with Microsoft
        </button>
      </div>
    </form>
  )
} 