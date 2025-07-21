"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail } from "lucide-react"
import { getFirebaseAuth } from "@/lib/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import { logger } from "@/lib/logger"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const auth = await getFirebaseAuth()
      if (!auth) throw new Error("Firebase auth not initialized")

      await sendPasswordResetEmail(auth, email, {
        // url: "http://localhost:3000/reset-password",
        url: "https://app.drinfo.ai/reset-password",
        handleCodeInApp: true
      })
      setSuccess(true)
    } catch (err: any) {
      logger.error("Password reset error:", err)
      
      // Handle specific Firebase auth errors
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Invalid email address')
          break
        case 'auth/user-not-found':
          setError('No account found with this email address')
          break
        case 'auth/too-many-requests':
          setError('Too many attempts. Please try again later')
          break
        default:
          setError(err.message || "An error occurred while sending the reset email")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handler for resending the email
  const handleResend = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const auth = await getFirebaseAuth()
      if (!auth) throw new Error("Firebase auth not initialized")
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "An error occurred while resending the email")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gradient-to-r from-blue-50 to-white">
      <div className="w-full max-w-md flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center justify-center mb-2">
          <img src="/login-logo.svg" alt="DR. INFO Logo" width={200} height={200} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'DM Sans', color: '#223258' }}>Reset Password</h1>
        </div>
        {success ? (
          <div className="w-full border border-[#3771FE80] bg-[#F4F7FF] rounded-xl p-8 flex flex-col items-center text-center">
            <img src="/emailout.svg" alt="Email sent" width={48} height={48} className="mb-4" />
            <h2 className="text-[20px] font-semibold mb-2" style={{ color: '#223258', fontFamily: 'DM Sans' }}>Check Your Email</h2>
            <p className="mb-1 text-[#000000] text-[12px] font-normal font-['DM_Sans']">We've sent a password reset link to <a href={`mailto:${email}`} className="text-[#3771FE] underline break-all font-['DM_Sans']">{email}</a></p>
            <p className="mb-4 text-[#000000] text-[12px] font-normal font-['DM_Sans']">Please check your inbox and follow the instructions.</p>
            <p className="text-[#000000] text-[12px] font-normal font-['DM_Sans']">Didn't receive the email? <button type="button" onClick={handleResend} className="text-[#3771FE] underline font-normal disabled:opacity-60 font-['DM_Sans']" disabled={isLoading}>{isLoading ? 'Resending...' : 'Resend Email'}</button></p>
          </div>
        ) : (
          <div className="w-full border border-[#3771FE80] bg-[#F4F7FF] rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-[#223258] text-base font-medium" style={{ fontFamily: 'DM Sans' }}>
                  Enter your email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[#3771FE80] bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-[#223258] text-[#223258] font-['DM_Sans']"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full border border-[#3771FE80] bg-[#C6D7FF]/50 text-[#3771FE] font-bold py-3 rounded-lg transition duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <Mail size={20} />
                {isLoading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg w-full max-w-md">
            {error}
          </div>
        )}
        <div className="text-center mt-4">
          <Link 
            href="/login" 
            className="text-base text-[#3771FE] hover:underline font-['DM_Sans']"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}