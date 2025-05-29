"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail } from "lucide-react"
import { getFirebaseAuth } from "@/lib/firebase"

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
      const { sendPasswordResetEmail } = await import("firebase/auth")
      const auth = await getFirebaseAuth()
      
      if (!auth) throw new Error("Firebase auth not initialized")

      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err: any) {
      console.error("Password reset error:", err)
      
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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gradient-to-r from-blue-50 to-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
          <p className="mt-2 text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg">
              Password reset email sent! Please check your inbox.
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            <Mail size={20} />
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>

          <div className="text-center">
            <Link 
              href="/login" 
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
} 