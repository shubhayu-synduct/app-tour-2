"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { PublicSidebar } from "./public-sidebar"
import Image from "next/image"

interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const router = useRouter()
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

  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard/public/')) {
      return 'Shared Chat'
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
        </div>
      </div>
      
      {/* Sidebar */}
      <PublicSidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      {/* Main content */} 
      <main className="flex-1 overflow-auto md:mt-0 mt-14">
        {children}
      </main>
    </div>
  )
} 