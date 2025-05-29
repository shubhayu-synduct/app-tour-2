"use client"

import { ExternalLink } from "@/components/external-link/external-link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"

export default function ExternalLinksPage() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout>
      {user && <ExternalLink user={user} />}
    </DashboardLayout>
  )
} 