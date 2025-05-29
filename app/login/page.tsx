"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { SignInForm } from "@/components/auth/signin-form"

export default function Login() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[90%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] flex flex-col items-center justify-center">
        {/* Logo and Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 w-full flex flex-col items-center">
          <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
            <Image
              src="/login-logo.svg"
              alt="DR. INFO Logo"
              width={251}
              height={73}
              className="text-white w-[40vw] sm:w-[30vw] md:w-[20vw] lg:w-[251px]"
              style={{ minWidth: '200px', maxWidth: '251px' }}
            />
          </div>
          <div className="w-full">
            <p 
              className="text-[#223258] font-semibold text-[5vw] sm:text-[4vw] md:text-[3vw] lg:text-[40px]" 
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
                lineHeight: '1.2',
                fontSize: 'clamp(20px, 5vw, 40px)'
              }}
            >
              Instant Access To Smart Clinical Insights
            </p>
          </div>
        </div>

        {/* Sign In Form */}
        <div className="w-full max-w-[90%] sm:max-w-[80%] md:max-w-md flex flex-col items-center">
          {error === "email-not-verified" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 w-full">
              <p className="text-yellow-800 text-xs sm:text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Please verify your email address before continuing. Check your inbox for the verification link.
              </p>
            </div>
          )}
          <div className="bg-indigo-50 rounded-lg shadow-sm border-indigo-300 border-2 p-4 sm:p-6 md:p-8 w-full">
            <SignInForm />
          </div>

          {/* Terms and Privacy */}
          <div className="text-center mt-4 sm:mt-5 md:mt-6 text-xs sm:text-sm text-gray-500 w-full" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-800">
              Terms of use
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-800">
              Privacy policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
