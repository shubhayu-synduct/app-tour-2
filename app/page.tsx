"use client"

import { redirect, useSearchParams } from 'next/navigation'

export default function HomePage() {
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
}
