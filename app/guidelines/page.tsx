"use client"

import Guidelines from "@/components/guidelines/guidelines"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"

export default function GuidelinesPage() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout>
      {user && <Guidelines />}
    </DashboardLayout>
  )
} 