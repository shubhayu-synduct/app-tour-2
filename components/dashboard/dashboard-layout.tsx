"use client"

import React, { useEffect,useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "./sidebar"

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

  // Keep sidebar open/close state in sync with localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isOpen.toString())
  }, [isOpen])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log("User not authenticated, redirecting to login...")
      router.push("/login")
    }
  }, [user, loading, router])

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
        {isOpen ? (
          <button
            className="p-2 hover:bg-gray-100 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            <img src="/sidebar_close_icon.svg" alt="Close Sidebar" className="w-7 h-7" />
          </button>
        ) : (
          <button
            className="p-2 hover:bg-gray-100 rounded-md"
            onClick={() => setIsOpen(true)}
          >
            <img src="/sidebar_open_icon.svg" alt="Open Sidebar" className="w-7 h-7" />
          </button>
        )}
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