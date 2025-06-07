"use client"

import React, { useEffect,useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "./sidebar"
import Image from "next/image"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebarOpen')
      return stored === null ? false : stored === 'true'
    }
    return false
  })
  const pathname = usePathname()

  // Keep sidebar open/close state in sync with localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isOpen.toString())
  }, [isOpen])

  // TEMPORARILY DISABLE COMPETING REDIRECT - AuthProvider handles this
  // useEffect(() => {
  //   if (!loading && !user) {
  //     console.log("User not authenticated, redirecting to login...")
  //     router.push("/login")
  //   }
  // }, [user, loading, router])

  const getPageTitle = () => {
    if (pathname === '/dashboard/history') {
      return 'History'
    } else if (pathname === '/dashboard/profile') {
      return 'Profile'
    } else if (pathname.startsWith('/dashboard/')) {
      return 'Dr. Info Summary'
    } else if (pathname === '/dashboard') {
      return (
        <Image 
          src="/full-icon.svg" 
          alt="Dr.Info" 
          width={120}
          height={32}
          className="h-8 w-auto"
          priority
        />
      )
    } else if (pathname === '/guidelines') {
      return (
        <div className="flex flex-col items-center">
          <h1 className="text-[#204398] font-semibold text-lg">Guidelines</h1>
        </div>
      )
    } else if (pathname === '/drug-information') {
      return 'Drug Information'
    }
    return (
      <Image 
        src="/full-icon.svg" 
        alt="Dr.Info" 
        width={120}
        height={32}
        className="h-8 w-auto"
        priority
      />
    )
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render anything
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Top Navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center px-4">
        <div className="flex items-center justify-between w-full">
          {isOpen ? (
            <button
              className="p-2 hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              <Image 
                src="/sidebar_close_icon.svg" 
                alt="Close Sidebar" 
                width={28}
                height={28}
                className="w-7 h-7"
                priority
              />
            </button>
          ) : (
            <button
              className="p-2 hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(true)}
            >
              <Image 
                src="/open-sidebar.svg" 
                alt="Open Sidebar" 
                width={28}
                height={28}
                className="w-7 h-7"
                priority
              />
            </button>
          )}
          <div className="flex-1 flex justify-center">
            <h1 className="text-[#204398] font-semibold text-lg">{getPageTitle()}</h1>
          </div>
          {pathname !== '/dashboard' && (
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <Image 
                src="/new-search.svg" 
                alt="New Search" 
                width={28}
                height={28}
                className="w-7 h-7"
                priority
              />
            </button>
          )}
          {pathname === '/dashboard' && <div className="w-11" />}
        </div>
      </div>
      
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      {/* Main content */} 
      <main className="flex-1 overflow-auto md:mt-0 mt-14">
        {children}
      </main>
    </div>
  )
} 