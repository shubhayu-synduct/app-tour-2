"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { getFirebaseAuth } from "@/lib/firebase"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const oobCode = searchParams.get("oobCode") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    try {
      const { confirmPasswordReset } = await import("firebase/auth")
      const auth = getFirebaseAuth()
      await confirmPasswordReset(auth, oobCode, password)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-white">
      <div className="w-full max-w-md flex flex-col items-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-2">
          <img src="/login-logo.svg" alt="DR. INFO Logo" width={200} height={200} />
        </div>
        {/* Main Content */}
        {!success ? (
          <>
            <h1 className="text-[24px] font-bold text-[#223258] font-['DM_Sans'] mb-6 text-center">Change your password</h1>
            <div className="w-full border border-[#3771FE80]/50 bg-[#F4F7FF] rounded-xl p-8">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-[10px] border border-[#3771FE80]/50 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-[#8997BA] text-[#223258] font-['DM_Sans'] pr-12"
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
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password..."
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-[10px] border border-[#3771FE80]/50 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-[#8997BA] text-[#223258] font-['DM_Sans'] pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full border border-[#3771FE80] bg-[#C6D7FF]/50 text-[#3771FE] font-bold py-3 rounded-[10px] transition duration-200 disabled:opacity-70"
                >
                  {loading ? "Updating..." : "Continue"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="w-full border border-[#3771FE80] bg-[#F4F7FF] rounded-xl p-8 flex flex-col items-center text-center">
            <img src="/password-success.svg" alt="Success" width={48} height={48} className="mb-4" />
            <h2 className="text-[20px] font-semibold mb-2" style={{ color: '#223258', fontFamily: 'DM Sans' }}>Your password has been updated</h2>
            <p className="mb-4 text-[#000000] text-[12px] font-normal font-['DM_Sans']">
              For security purposes we've sent a notification to your account confirming this change.
            </p>
            <Link
              href="/login"
              className="w-full block border border-[#3771FE80] bg-[#C6D7FF]/50 text-[#3771FE] font-bold py-3 rounded-lg transition duration-200 text-center"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}