"use client"

import { redirect, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function HomePageContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const oobCode = searchParams.get('oobCode')
  const apiKey = searchParams.get('apiKey')
  const continueUrl = searchParams.get('continueUrl')
  const lang = searchParams.get('lang')

  // Handle email verification first
  if (mode === 'verifyEmail' && oobCode) {
    // Create new URLSearchParams with all necessary parameters
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('oobCode', oobCode)
    if (apiKey) params.set('apiKey', apiKey)
    if (lang) params.set('lang', lang)
    
    // Always redirect to verify-email page with the parameters
    redirect(`/verify-email?${params.toString()}`)
  }

  // Handle password reset
  if (mode === 'resetPassword' && oobCode) {
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('oobCode', oobCode)
    if (apiKey) params.set('apiKey', apiKey)
    if (lang) params.set('lang', lang)
    
    redirect(`/reset-password?${params.toString()}`)
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
