"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getAuth, applyActionCode } from "firebase/auth"
import Image from "next/image"
import { getFirebaseAuth } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { logger } from "@/lib/logger"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [alreadyVerified, setAlreadyVerified] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  const handleSuccessfulVerification = async () => {
    if (!user) {
      logger.info("No user found after verification, redirecting to onboarding")
      router.push("/onboarding")
      return
    }

    setRedirecting(true)
    
    try {
      // Check user's onboarding status
      const { getFirebaseFirestore } = await import("@/lib/firebase")
      const { doc, getDoc } = await import("firebase/firestore")
      
      const db = await getFirebaseFirestore()
      if (!db) {
        logger.error("Firestore not available")
        router.push("/onboarding")
        return
      }
      
      logger.info("Checking onboarding status for user:", user.uid)
      const userDoc = await getDoc(doc(db, "users", user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        logger.info("User document found:", userData)
        if (userData?.onboardingCompleted) {
          logger.info("User onboarding completed, redirecting to dashboard")
          router.push('/dashboard')
        } else {
          logger.info("User onboarding not completed, redirecting to onboarding")
          router.push('/onboarding')
        }
      } else {
        logger.info("User document does not exist, creating new user and redirecting to onboarding")
        
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
        
        router.push('/onboarding')
      }
    } catch (error) {
      logger.error("Error checking user onboarding status:", error)
      // Default to onboarding on error for new email verification
      router.push('/onboarding')
    }
  }

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const auth = await getFirebaseAuth()
        if (!auth) throw new Error("Firebase auth not initialized")

        // Get all necessary parameters
        const oobCode = searchParams.get("oobCode")
        const mode = searchParams.get("mode")
        const apiKey = searchParams.get("apiKey")

        logger.info("Verification parameters:", { oobCode: !!oobCode, mode, apiKey: !!apiKey })

        // Validate required parameters
        if (!oobCode) {
          throw new Error("No verification code found")
        }

        if (mode !== "verifyEmail") {
          throw new Error("Invalid verification mode")
        }

        try {
          // Apply the verification code
          await applyActionCode(auth, oobCode)
          logger.info("Email verification successful!")
          setVerified(true)
          setError("") // Clear any existing errors
          // Redirect to onboarding after successful verification
          handleSuccessfulVerification()
        } catch (verificationError: any) {
          logger.error("Verification error details:", {
            code: verificationError.code,
            message: verificationError.message,
            fullError: verificationError
          })

          if (verificationError.code === "auth/invalid-action-code") {
            if (verificationError.message.includes("already verified")) {
              setAlreadyVerified(true)
              setError("") // Clear error when already verified
            } else {
              setError("This verification link has expired or is invalid. Please request a new verification email.")
            }
          } else if (verificationError.code === "auth/expired-action-code") {
            setError("This verification link has expired. Please request a new verification email.")
          } else {
            setError(`Verification failed: ${verificationError.message || "Unknown error"}`)
          }
        }
      } catch (err: any) {
        logger.error("Error in verification process:", {
          message: err.message,
          code: err.code,
          fullError: err
        })
        setError(err.message || "Failed to verify email")
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [router, searchParams])

  const handleSignIn = () => {
    // Clear any existing session to ensure fresh login
    const auth = getAuth()
    auth.signOut().then(() => {
      router.push("/login")
    })
  }

  if (verified && redirecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#F4F7FF] rounded-xl shadow-lg border-2 border-blue-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-['DM_Sans']">
                Email Verified Successfully!
              </h3>
              <p className="text-gray-600">Redirecting you to continue...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="mr-3">
              <Image
                src="/full-icon.svg"
                alt="DR. INFO Logo"
                width={32}
                height={32}
                className="text-white"
              />
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-[#F4F7FF] rounded-xl shadow-lg border-2 border-blue-200 p-8">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          ) : error ? (
            <div className="text-center font-['DM_Sans']">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-['DM_Sans']">
                Verification Failed
              </h3>
              <p className="text-gray-600 mb-6 font-['DM_Sans']">{error}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSignIn}
                  className="w-full bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 py-3 px-4 rounded-[10px] font-medium font-['DM_Sans'] transition duration-200 hover:bg-[#C6D7FF]"
                >
                  Return to Login
                </button>
              </div>
            </div>
          ) : alreadyVerified ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Email Already Verified
              </h3>
              <p className="text-gray-600 mb-6">
                Your email has already been verified.
                <br />
                You can proceed to sign in.
              </p>
              <button
                onClick={handleSignIn}
                className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Sign In
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}