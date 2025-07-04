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
  Plus,
  ChevronDown,
  Settings,
} from "lucide-react"

interface PublicSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function PublicSidebar({ isOpen, setIsOpen }: PublicSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLElement>(null)

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
            </nav>
          </div>
        </div>
      </aside>
    </>
  )
} 