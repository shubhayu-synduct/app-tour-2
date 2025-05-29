"use client"

import { DrugInteractions } from "@/components/drug-interactions/drug-interactions"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"

export default function DrugInteractionsPage() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout>
      {user && <DrugInteractions user={user} />}
    </DashboardLayout>
  )
} 