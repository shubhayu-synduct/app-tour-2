"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"

interface EmailVerifiedModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EmailVerifiedModal({ isOpen, onClose }: EmailVerifiedModalProps) {
  const router = useRouter()

  console.log("EmailVerifiedModal render - isOpen:", isOpen)

  if (!isOpen) return null

  const handleSignIn = () => {
    onClose()
    router.push("/login")
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#F4F7FF] rounded-xl shadow-lg border-2 border-[#3771FE80] p-8 max-w-md w-full relative">
        <div className="text-center flex flex-col items-center">
          <img src="/login-logo.svg" alt="DR. INFO Logo" width={200} height={57} className="mx-auto mb-4" />
          
          <div className="flex items-center justify-center mx-auto mb-4">
            <Image
              src="/password-success.svg"
              alt="Success"
              width={64}
              height={64}
            />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2 font-['DM_Sans']">
            Email Verified Successfully!
          </h3>
          
          <p className="text-gray-600 mb-2 font-['DM_Sans']">
            Your email has been successfully verified.
          </p>
          
          <p className="text-gray-600 mb-6 font-['DM_Sans']">
            You can now sign in to your account and access all features.
          </p>
          
          <button
            onClick={handleSignIn}
            className="w-full bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 py-3 px-4 rounded-[10px] font-medium font-['DM_Sans'] transition duration-200 hover:bg-[#C6D7FF]"
          >
            Continue to Sign In
          </button>
        </div>
      </div>
    </div>
  )
} 