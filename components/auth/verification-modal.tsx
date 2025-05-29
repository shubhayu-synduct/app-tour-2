"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

interface VerificationModalProps {
  email: string
  onClose: () => void
}

export function VerificationModal({ email, onClose }: VerificationModalProps) {
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const router = useRouter()

  // Prevent closing the modal by clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('modal-overlay')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
      }
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleResendVerification = async () => {
    setResending(true)
    setResendMessage("")
    try {
      const { getAuth, sendEmailVerification } = await import("firebase/auth")
      const auth = getAuth()
      const user = auth.currentUser

      if (user) {
        await sendEmailVerification(user, {
          url: `${window.location.origin}/verify-email`,
          handleCodeInApp: true
        })
        setResendMessage("Verification email sent! Please check your inbox.")
      } else {
        setResendMessage("Please sign in again to resend the verification email.")
      }
    } catch (error: any) {
      console.error("Error resending verification email:", error)
      setResendMessage(error.message || "Failed to resend verification email. Please try again.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-8 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Verify Your Email
          </h3>
          <p className="text-gray-600 mb-4">
            We've sent a verification link to <span className="font-medium">{email}</span>.
            Please check your email and click the link to verify your account.
          </p>
          <p className="text-gray-600 mb-4">
            You must verify your email before you can access the application.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you don't see the email, please check your spam folder.
          </p>
          {resendMessage && (
            <div className={`mb-4 p-3 rounded-lg ${
              resendMessage.includes("sent") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            }`}>
              {resendMessage}
            </div>
          )}
          <div className="space-y-3">
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full bg-blue-50 text-blue-600 border border-blue-200 py-2 px-4 rounded-lg hover:bg-blue-100 transition duration-200 font-medium disabled:opacity-70"
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-50 text-gray-600 border border-gray-200 py-2 px-4 rounded-lg hover:bg-gray-100 transition duration-200 font-medium"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 