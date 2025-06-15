"use client"

import { useState, useRef, useEffect } from "react"
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
import { useAuth } from '@/hooks/use-auth'
import { doc, getDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from '@/lib/firebase'

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const user = getSessionCookie()
  const sidebarRef = useRef<HTMLElement>(null)
  const { user: authUser } = useAuth()
  const [userProfile, setUserProfile] = useState<{ firstName?: string; lastName?: string; occupation?: string }>({})

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return
      
      try {
        const db = getFirebaseFirestore()
        const docRef = doc(db, "users", authUser.uid)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const profileData = docSnap.data().profile || {}
          setUserProfile({
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            occupation: profileData.occupation
          })
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
    }

    fetchUserProfile()
  }, [authUser])

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Only close on mobile view
        if (window.innerWidth < 768) {
          setIsOpen(false)
        }
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside)
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setIsOpen])

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
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`bg-white border-r border-gray-200 h-[100dvh] flex flex-col transition-all duration-300 ease-in-out font-['DM_Sans'] ${
          isOpen ? "w-72" : "w-20"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-40`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4">
            {/* Logo */}
            <div className={`flex ${isOpen ? 'items-center justify-between' : 'flex-col items-center'} mb-8`}>
              <div className="flex items-center">
                {isOpen ? (
                  <img src="/login-logo.svg" alt="DR. INFO Logo" className="h-8" />
                ) : (
                  <div className="relative w-8 h-8">
                    <img src="/icon.svg" alt="DR. INFO Logo" className="w-8 h-8" />
                  </div>
                )}
              </div>
              {isOpen ? (
                <button
                  className="flex items-center justify-center hover:bg-gray-100 rounded-md"
                  onClick={() => {
                    setIsOpen(false);
                    setIsProfileOpen(false);
                  }}
                >
                  <img src="/sidebar_close_icon.svg" alt="Close Sidebar" className="w-7 h-7" />
                </button>
              ) : (
                <button
                  className="hidden md:flex items-center justify-center hover:bg-gray-100 rounded-md mt-4"
                  onClick={() => setIsOpen(true)}
                >
                  <img src="/open-sidebar.svg" alt="Open Sidebar" className="w-7 h-7" />
                </button>
              )}
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              <div className="mb-6">
                <button
                  className="flex items-center justify-center w-full rounded-md p-2 border border-solid border-[#cecece] hover:bg-gray-50"
                  onClick={() => {
                    router.push("/dashboard");
                    if (window.innerWidth < 768) {
                      setIsOpen(false);
                    }
                  }}
                >
                  <img src="/new-search.svg" alt="New Search" className="w-5 h-5" />
                  {isOpen && <span className="ml-3 text-[16px] font-medium text-[#223258]">New Search</span>}
                </button>
              </div>

              <Link
                href="/dashboard"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg font-medium ${
                  isActive('/dashboard') 
                    ? 'text-[#223258] bg-blue-50' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <img src="/home.svg" alt="Home" className="h-5 w-5" />
                {isOpen && <span className="ml-3">Home</span>}
              </Link>

              <Link 
                href="/guidelines"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg ${
                  isActive('/guidelines') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <img src="/guidelines.svg" alt="Guidelines" className="h-5 w-5" />
                {isOpen && <span className="ml-3">Guidelines</span>}
              </Link>

              <Link 
                href="/drug-information"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg ${
                  isActive('/drug-information') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <img src="/drugs.svg" alt="Drug Information" className="h-5 w-5" />
                {isOpen && <span className="ml-3">Drug Information</span>}
              </Link>
              
              <Link 
                href="/dashboard/history"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-lg ${
                  isActive('/dashboard/history') 
                    ? 'text-[#223258] bg-blue-50 font-medium' 
                    : 'text-[#223258] hover:bg-gray-100'
                }`}
              >
                <img src="/history.svg" alt="History" className="h-5 w-5" />
                {isOpen && <span className="ml-3">History</span>}
              </Link>
            </nav>
          </div>

          {/* Sidebar History List - fills available space, scrollable, no overlap */}
          {isOpen && (
            <div className="flex-1 min-h-0 px-2 pb-2 border-b border-gray-200 overflow-y-auto scrollbar-hide">
              <SidebarHistory />
            </div>
          )}

          {/* Profile Section (always at bottom) */}
          <div className="mt-auto w-full p-2 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-[8px] bg-[#E4ECFF] flex items-center justify-center text-[#223258] font-semibold border border-[#223258]">
                    {userProfile.firstName?.[0] || user?.email?.[0]}
                  </div>
                  {isOpen && (
                    <div className="ml-3 text-left">
                      <p className="font-semibold text-sm text-[#223258]">
                        {userProfile.firstName && userProfile.lastName 
                          ? `${userProfile.firstName} ${userProfile.lastName}`
                          : user?.email}
                      </p>
                      <p className="text-xs text-[#223258]/70">
                        {userProfile.occupation 
                          ? userProfile.occupation.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')
                          : 'User'}
                      </p>
                    </div>
                  )}
                </div>
                {isOpen && (
                  <ChevronDown className={`h-5 w-5 text-[#223258] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className={`absolute ${isOpen ? 'bottom-full left-0 w-full' : 'bottom-0 left-full ml-2 w-48'} mb-2 bg-white rounded-[10px] shadow-lg border border-[#B5C9FC]`}>
                  <div className="p-2">
                    {/* Profile Settings */}
                    <button
                      className="flex items-center w-full px-3 py-2 rounded-[8px] bg-[#E4ECFF] text-[#223258] font-semibold mb-1"
                      onClick={() => {
                        router.push("/dashboard/profile");
                        if (window.innerWidth < 768) {
                          setIsOpen(false);
                          setIsProfileOpen(false);
                        }
                      }}
                    >
                      <svg className="mr-3 h-5 w-5" fill="none" stroke="#223258" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Profile Settings
                    </button>
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
        </div>
      </aside>
    </>
  )
}