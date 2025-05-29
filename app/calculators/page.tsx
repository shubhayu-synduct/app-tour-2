"use client"

import { Calculators } from "@/components/calculators/calculators"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"

export default function CalculatorsPage() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout>
      {user && <Calculators user={user} />}
    </DashboardLayout>
  )
} 