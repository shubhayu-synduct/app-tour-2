"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getAuth, applyActionCode } from "firebase/auth"
import Image from "next/image"
import { getFirebaseAuth } from "@/lib/firebase"
import { EmailVerifiedModal } from "@/components/auth/email-verified-modal"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [alreadyVerified, setAlreadyVerified] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log("showSuccessModal state changed:", showSuccessModal)
  }, [showSuccessModal])

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const auth = await getFirebaseAuth()
        if (!auth) throw new Error("Firebase auth not initialized")

        // Get all necessary parameters
        const oobCode = searchParams.get("oobCode")
        const mode = searchParams.get("mode")
        const apiKey = searchParams.get("apiKey")

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
          console.log("Email verification successful!")
          setVerified(true)
          // Show success modal immediately
          console.log("Setting showSuccessModal to true")
          setShowSuccessModal(true)
        } catch (verificationError: any) {
          console.error("Verification error:", verificationError)
          if (verificationError.code === "auth/invalid-action-code") {
            // Check if the error is due to already being verified
            if (verificationError.message.includes("already verified")) {
              setAlreadyVerified(true)
            } else {
              setError("This verification link has expired or is invalid. Please request a new verification email.")
            }
          } else {
            setError(verificationError.message || "Failed to verify email")
          }
        }
      } catch (err: any) {
        console.error("Error in verification process:", err)
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

  return (
    <>
      {!showSuccessModal && (
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
      )}

      {/* Background when modal is showing */}
      {showSuccessModal && (
        <div className="min-h-screen bg-gray-50"></div>
      )}

      {/* Success Modal */}
      <EmailVerifiedModal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
      />
    </>
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