"use client"

import { redirect, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function HomePageContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const oobCode = searchParams.get('oobCode')

  // Handle password reset
  if (mode === 'resetPassword' && oobCode) {
    const params = new URLSearchParams(searchParams)
    redirect(`/reset-password?${params.toString()}`)
  }

  // Handle email verification (which leads to onboarding)
  if (mode === 'verifyEmail' && oobCode) {
    const params = new URLSearchParams(searchParams)
    redirect(`/verify-email?${params.toString()}`)
  }

  // Default redirect to login
  redirect('/login')

  // This line will never be reached due to the redirects above,
  // but it's needed to satisfy TypeScript's return type requirements
  return null
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}
