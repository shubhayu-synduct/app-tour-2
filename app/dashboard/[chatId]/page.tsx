"use client"

import { useAuth } from "@/hooks/use-auth"
import { DrInfoSummary } from "@/components/drinfo-summary/drinfo-summary"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useParams } from "next/navigation"

export default function ChatSession() {
  const { user } = useAuth()
  const params = useParams()
  const sessionId = params?.chatId as string

  return (
    <DashboardLayout>
      {user && <DrInfoSummary user={user} sessionId={sessionId} />}
    </DashboardLayout>
  )
} 