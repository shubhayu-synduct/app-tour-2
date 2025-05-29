"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getAuth, applyActionCode } from "firebase/auth"
import Image from "next/image"

export default function VerifyEmail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const auth = getAuth()
        const oobCode = searchParams.get("oobCode")

        if (!oobCode) {
          throw new Error("No verification code found")
        }

        await applyActionCode(auth, oobCode)
        
        // Redirect to onboarding after successful verification
        router.push("/onboarding")
      } catch (err: any) {
        console.error("Error verifying email:", err)
        setError(err.message || "Failed to verify email")
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="mr-3">
              <Image
                src="/icon.svg"
                alt="DR. INFO Logo"
                width={32}
                height={32}
                className="text-white"
              />
            </div>
            <h1 className="text-2xl font-bold text-blue-800">DR. INFO</h1>
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-8">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          ) : error ? (
            <div className="text-center">
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push("/login")}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Email Verified!
              </h3>
              <p className="text-gray-600 mb-4">
                Your email has been successfully verified.
                <br />
                Redirecting to onboarding...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 