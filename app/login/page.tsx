"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { SignInForm } from "@/components/auth/signin-form"

export default function SignIn() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2 sm:p-4 font-['DM_Sans']">
      <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[60%] flex flex-col items-center justify-center">
        {/* Logo and Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 w-full flex flex-col items-center">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <Image
              src="/full-icon.svg"
              alt="DR. INFO Logo"
              width={150}
              height={32}
              className="text-white w-[150px] sm:w-[180px] md:w-[200px] lg:w-[200px]"
            />
          </div>
          <div className="w-full">
            <p 
              className="text-[#223258] mt-5 mb-2 font-medium text-[24px] sm:text-[28px] md:text-[30px] lg:text-[30px] font-['DM_Sans']" 
              style={{ 
                lineHeight: '1.2'
              }}
            >
              Welcome Back!
            </p>
          </div>
        </div>

        {/* Sign In Form */}
        <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-md flex flex-col items-center">
          <div className="bg-[#F4F7FF] rounded-[10px] shadow-sm border-[#3771FE]/50 border-2 p-3 sm:p-5 md:p-6 lg:p-8 w-full">
            <SignInForm />
          </div>

          {/* Terms and Privacy */}
          <div className="text-center mt-4 sm:mt-5 md:mt-6 text-xs sm:text-sm text-gray-500 font-['DM_Sans'] w-full px-2">
            By signing in, you agree to our{' '}
            <Link href="https://synduct.com/terms-and-conditions/" className="text-[#3771FE] hover:text-[#3771FE] font-['DM_Sans']" target="_blank" rel="noopener noreferrer">
              Terms of use
            </Link>
            {' '}and{' '}
            <Link href="https://synduct.com/privacy-policy/" className="text-[#3771FE] hover:text-[#3771FE] font-['DM_Sans']" target="_blank" rel="noopener noreferrer">
              Privacy policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 