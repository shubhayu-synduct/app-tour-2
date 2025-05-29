"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Home,
  FileText,
  Pill,
  ExternalLink as ExternalLinkIcon,
  Stethoscope,
  GraduationCap,
  Folder,
  History,
  Menu,
  X,
  LogOut,
  Plus,
} from "lucide-react"
import { clearSessionCookie } from "@/lib/auth-service"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      // Dynamically import Firebase auth
      const { getFirebaseAuth } = await import("@/lib/firebase")
      const { signOut } = await import("firebase/auth")

      const auth = await getFirebaseAuth()
      if (!auth) {
        throw new Error("Auth not initialized")
      }

      // Sign out of Firebase
      await signOut(auth)
      
      // Clear our custom session cookie
      clearSessionCookie()
      
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`bg-white w-64 border-r border-gray-200 h-screen overflow-y-auto transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static z-40`}
      >
        <div className="p-4">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <div className="relative w-8 h-8 mr-2">
              <img src="/icon.svg" alt="DR. INFO Logo" className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-blue-900">DR. INFO</h1>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <div className="px-3 py-2 mb-6">
              <button
                className="flex items-center w-full p-2 rounded-md border border-solid border-[#cecece] hover:bg-gray-50"
                onClick={() => router.push("/dashboard")}
              >
                <Plus className="w-5 h-5" />
                <span className="ml-3 text-[16px] font-small text-[#213158]">New Search</span>
              </button>
            </div>

            <Link
              href="/dashboard"
              className={`flex items-center px-3 py-2 rounded-md font-medium ${
                isActive('/dashboard') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <img src="/home.svg" alt="Home" className="mr-3 h-5 w-5" />
              Home
            </Link>

            <Link 
              href="/guidelines"
              className={`flex items-center px-3 py-2 rounded-md ${
                isActive('/guidelines') 
                  ? 'text-blue-600 bg-blue-50 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
          
              <img src="/guidelines.svg" alt="Guidelines" className="mr-3 h-5 w-5" />
              Guidelines
            </Link>

            <Link 
              href="/drug-information"
              className={`flex items-center px-3 py-2 rounded-md ${
                isActive('/drug-information') 
                  ? 'text-blue-600 bg-blue-50 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <img src="/drugs.svg" alt="Drug Information" className="mr-3 h-5 w-5" />
              Drug Information
            </Link>
            
            <Link 
              href="/dashboard/history"
              className={`flex items-center px-3 py-2 rounded-md ${
                isActive('/dashboard/history') 
                  ? 'text-blue-600 bg-blue-50 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <img src="/history.svg" alt="History" className="mr-3 h-5 w-5" />
              History
            </Link>
          </nav>
        </div>

        {/* Sign out button */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center px-3 py-2 w-full text-red-600 hover:bg-red-50 rounded-md"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}