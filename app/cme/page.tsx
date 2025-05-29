"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { ContentLayout } from "@/components/shared/content-layout"
import { GraduationCap } from "lucide-react"

export default function CMEPage() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout>
      {user && (
        <ContentLayout 
          title="CME Access" 
          description="Continuing Medical Education resources and tracking"
          user={user}
        >
          <div className="text-center py-10">
            <GraduationCap size={48} className="mx-auto text-blue-300 mb-4" />
            <p className="text-gray-500 mb-4">
              CME access and tracking will be available soon.
            </p>
          </div>
        </ContentLayout>
      )}
    </DashboardLayout>
  )
} 