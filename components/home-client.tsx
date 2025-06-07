"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

interface HomeClientProps {
  fallback: ReactNode
}

export function HomeClient({ fallback }: HomeClientProps) {
  const { user, loading } = useAuth() // Use centralized auth instead of duplicate listener

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-white p-6">
        <div className="animate-pulse">Loading...</div>
      </main>
    )
  }

  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-white p-6">
        <div className="flex items-center mb-8">
          <div className="relative w-10 h-10 mr-2">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-900 rounded-sm"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center ml-1 mt-1">
              <div className="w-8 h-8 border-2 border-blue-900 rounded-sm"></div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-blue-900">AI Chatbot</h1>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <Link href="/dashboard">
            <Button className="w-48">Go to Dashboard</Button>
          </Link>
        </div>
      </main>
    )
  }

  // Not authenticated, return the fallback
  return <>{fallback}</>
} 