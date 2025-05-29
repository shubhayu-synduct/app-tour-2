"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { SignUpForm } from "@/components/auth/signup-form"

export default function SignUp() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/full-icon.svg"
              alt="DR. INFO Logo"
              width={251}
              height={73}
              className="text-white"
            />
          </div>
          <div className="whitespace-nowrap">
            <p className="text-gray-600 font-medium text-3xl">Instant Access To Smart Clinical Insights</p>
          </div>
        </div>

        {/* Sign Up Form */}
        <div className="max-w-md mx-auto">
          <div className=" bg-indigo-50 rounded-lg shadow-sm border-indigo-300 border-2 p-8">
            <SignUpForm />
          </div>

          {/* Terms and Privacy */}
          <div className="text-center mt-6 text-sm text-gray-500">
            By signing up, you agree to our{' '}
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
