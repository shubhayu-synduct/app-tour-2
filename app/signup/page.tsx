"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { SignUpForm } from "@/components/auth/signup-form"

export default function SignUp() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-['DM_Sans']">
      <div className="w-full max-w-[90%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] flex flex-col items-center justify-center">
        {/* Logo and Header */}
        <div className="text-center mb-8 w-full flex flex-col items-center">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/full-icon.svg"
              alt="DR. INFO Logo"
              width={251}
              height={73}
              className="text-white w-[40vw] sm:w-[30vw] md:w-[20vw] lg:w-[251px]"
              style={{ minWidth: '200px', maxWidth: '251px' }}
            />
          </div>
          <div className="w-full">
            <p 
              className="text-[#223258] font-medium text-[5vw] sm:text-[4vw] md:text-[3vw] lg:text-[40px] font-['DM_Sans']" 
              style={{ 
                lineHeight: '1.2',
                fontSize: 'clamp(20px, 5vw, 32px)'
              }}
            >
              Instant Access To Smart Clinical Insights
            </p>
          </div>
        </div>

        {/* Sign Up Form */}
        <div className="w-full max-w-[90%] sm:max-w-[80%] md:max-w-md flex flex-col items-center">
          <div className="bg-[#F4F7FF] rounded-[10px] shadow-sm border-indigo-300 border-2 p-4 sm:p-6 md:p-8 w-full">
            <SignUpForm />
          </div>

          {/* Terms and Privacy */}
          <div className="text-center mt-6 text-sm text-gray-500 font-['DM_Sans'] w-full">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-800 font-['DM_Sans']">
              Terms of use
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-800 font-['DM_Sans']">
              Privacy policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
