"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { logger } from "@/lib/logger"

interface VerificationModalProps {
  email: string
  onClose: () => void
  redirectToLogin?: boolean
}

export function VerificationModal({ email, onClose, redirectToLogin = false }: VerificationModalProps) {
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const router = useRouter()

  // Check email verification status periodically
  useEffect(() => {
    if (!redirectToLogin) {
      const checkEmailVerification = async () => {
        try {
          const { getAuth } = await import("firebase/auth")
          const auth = getAuth()
          const user = auth.currentUser
          
          if (user) {
            await user.reload() // Refresh user data from Firebase
            if (user.emailVerified) {
              logger.authLog("Email verified, closing modal")
              onClose()
              // Trigger a page refresh to update auth state
              window.location.reload()
            }
          }
        } catch (error) {
          logger.error("Error checking email verification:", error)
        }
      }

      // Check every 3 seconds
      const interval = setInterval(checkEmailVerification, 3000)
      
      return () => clearInterval(interval)
    }
  }, [onClose, redirectToLogin])

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
      logger.error("Error resending verification email:", error)
      setResendMessage(error.message || "Failed to resend verification email. Please try again.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-[#F4F7FF] rounded-xl shadow-lg border border-[#3771FE80] p-8 max-w-md w-full relative">
        <button
          onClick={() => {
            onClose()
            if (redirectToLogin) {
              router.push("/login")
            }
          }}
          className="absolute top-4 right-4 text-blue-600 font-bold hover:text-blue-800"
        >
          <X size={20} />
        </button>
        <div className="text-center flex flex-col items-center">
          <img src="/login-logo.svg" alt="DR. INFO Logo" width={200} height={57} className="mx-auto mb-4" />
          <img src="/emailout.svg" alt="Success" width={64} height={64} className="mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Verify Your Email
          </h3>
          <p className="text-gray-600 mb-4">
            We've sent a verification link to <span className="font-medium text-[#3771FE]">{email}</span>.
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
              className="w-full bg-[#C6D7FF]/50 text-[#3771FE] border border-blue-200 py-2 px-4 rounded-lg hover:bg-[#C6D7FF] transition duration-200 font-medium disabled:opacity-70"
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>
            <button
              onClick={() => {
                onClose()
                if (redirectToLogin) {
                  router.push("/login")
                }
              }}
              className="w-full bg-gray-50 text-gray-600 border border-gray-200 py-2 px-4 rounded-lg hover:bg-[#C6D7FF]/50 transition duration-200 font-medium"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}