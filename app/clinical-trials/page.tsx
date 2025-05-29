"use client"

import { ClinicalTrials } from "@/components/clinical-trials/clinical-trials"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"

export default function ClinicalTrialsPage() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout>
      {user && <ClinicalTrials user={user} />}
    </DashboardLayout>
  )
} 