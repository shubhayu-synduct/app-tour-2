"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { ContentLayout } from "@/components/shared/content-layout"
import { Folder, Plus } from "lucide-react"

export default function ProjectsPage() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout>
      {user && (
        <ContentLayout 
          title="Your Projects" 
          description="Access and manage your saved projects and research"
          user={user}
        >
          <div className="flex flex-col items-center justify-center py-16">
            <Folder size={64} className="text-blue-100 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              Create your first project to organize research, clinical notes, and references in one place.
            </p>
            <button className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
              <Plus size={18} className="mr-2" />
              Create New Project
            </button>
          </div>
        </ContentLayout>
      )}
    </DashboardLayout>
  )
} 