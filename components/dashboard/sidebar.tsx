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
  ChevronDown,
  Settings,
} from "lucide-react"
import { clearSessionCookie, getSessionCookie } from "@/lib/auth-service"
import { SidebarHistory } from "./sidebar-history"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const user = getSessionCookie()

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
        className={`bg-white w-64 border-r border-gray-200 h-screen flex flex-col transition-all duration-300 ease-in-out font-['DM_Sans'] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static z-40`}
      >
        {/* Main content: logo, nav, history */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="p-4">
            {/* Logo */}
            <div className="flex items-center mb-8">
              <div className="relative w-8 h-8 mr-2">
                <img src="/icon.svg" alt="DR. INFO Logo" className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-[#223258]">DR. INFO</h1>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              <div className="px-3 py-2 mb-6">
                <button
                  className="flex items-center w-full p-2 rounded-lg border border-solid border-[#cecece] hover:bg-gray-50"
                  onClick={() => router.push("/dashboard")}
                >
                  <Plus className="w-5 h-5" />
                  <span className="ml-3 text-[16px] font-medium text-[#223258]">New Search</span>
                </button>
              </div>

              <Link
                href="/dashboard"
                className={`flex items-center px-3 py-2 rounded-lg font-medium ${
                  isActive('/dashboard') 
                    ? 'text-[#223258] bg-blue-50' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <img src="/home.svg" alt="Home" className="mr-3 h-5 w-5" />
                Home
              </Link>

              <Link 
                href="/guidelines"
                className={`flex items-center px-3 py-2 rounded-lg ${
                  isActive('/guidelines') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <img src="/guidelines.svg" alt="Guidelines" className="mr-3 h-5 w-5" />
                Guidelines
              </Link>

              <Link 
                href="/drug-information"
                className={`flex items-center px-3 py-2 rounded-lg ${
                  isActive('/drug-information') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <img src="/drugs.svg" alt="Drug Information" className="mr-3 h-5 w-5" />
                Drug Information
              </Link>
              
              <Link 
                href="/dashboard/history"
                className={`flex items-center px-3 py-2 rounded-lg ${
                  isActive('/dashboard/history') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <img src="/history.svg" alt="History" className="mr-3 h-5 w-5" />
                History
              </Link>
            </nav>
          </div>

          {/* Sidebar History List - fills available space, scrollable, no overlap */}
          <div className="flex-1 min-h-0 px-2 pb-2 border-b border-gray-200 overflow-y-auto scrollbar-hide">
            <SidebarHistory />
          </div>
        </div>

        {/* Profile Section (always at bottom) */}
        <div className="w-full p-2 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-[8px] bg-[#E4ECFF] flex items-center justify-center text-[#223258] font-semibold border border-[#223258]">
                  {/* {console.log(user)} */}
                  {user?.displayName?.[0]}
                </div>
                <div className="ml-3 text-left">
                  <p className="font-semibold text-sm text-[#223258]">{user?.displayName}</p>
                  <p className="text-xs text-[#223258]/70">Physician</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-[#223258] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-[10px] shadow-lg border border-[#B5C9FC]">
                <div className="p-2">
                  {/* Profile Settings */}
                  <button className="flex items-center w-full px-3 py-2 rounded-[8px] bg-[#E4ECFF] text-[#223258] font-semibold mb-1">
                    <svg className="mr-3 h-5 w-5" fill="none" stroke="#223258" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Profile Settings
                  </button>
                  {/* Mode Preferences */}
                  <div className="px-3 py-2 text-sm text-[#223258]">
                    <label htmlFor="mode-select" className="font-semibold block mb-1">Mode Preferences</label>
                    <select id="mode-select" className="w-full rounded-[8px] border border-[#B5C9FC] px-2 py-1 text-[#223258] font-semibold focus:outline-none focus:ring-2 focus:ring-[#E4ECFF] bg-white">
                      <option value="default">Default</option>
                      <option value="acute">Acute</option>
                    </select>
                  </div>
                  {/* Sign Out */}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-3 py-2 text-[#223258] hover:bg-[#E4ECFF] rounded-[8px] mt-1 font-semibold"
                  >
                    <svg className="mr-3 h-5 w-5" fill="none" stroke="#223258" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}