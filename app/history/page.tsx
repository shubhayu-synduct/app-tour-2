"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { ContentLayout } from "@/components/shared/content-layout"
import { History, Clock } from "lucide-react"

export default function HistoryPage() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout>
      {user && (
        <ContentLayout 
          title="Search History" 
          description="View and manage your recent searches and activities"
          user={user}
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800">Recent Activities</h3>
              <button className="text-blue-600 text-sm hover:underline">Clear all</button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              {/* Demo history items */}
              {[
                { 
                  type: "search", 
                  query: "Hypertension treatment guidelines", 
                  timestamp: "Today, 10:24 AM" 
                },
                { 
                  type: "view", 
                  content: "Lisinopril drug information", 
                  timestamp: "Today, 09:45 AM" 
                },
                { 
                  type: "search", 
                  query: "Type 2 diabetes management", 
                  timestamp: "Yesterday, 3:12 PM" 
                },
                { 
                  type: "interaction", 
                  content: "Warfarin + Ibuprofen interaction check", 
                  timestamp: "Yesterday, 11:30 AM" 
                },
                { 
                  type: "view", 
                  content: "Atrial Fibrillation guidelines", 
                  timestamp: "2 days ago" 
                }
              ].map((item, index) => (
                <div key={index} className="py-3 border-b border-gray-100 flex items-start">
                  <div className="bg-blue-50 p-2 rounded-full mr-3">
                    {item.type === "search" && <History size={18} className="text-blue-500" />}
                    {item.type === "view" && <History size={18} className="text-green-500" />}
                    {item.type === "interaction" && <History size={18} className="text-orange-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.type === "search" ? `Searched for "${item.query}"` : item.content}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock size={14} className="mr-1" />
                      {item.timestamp}
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* No more history notice */}
            <div className="text-center py-6 text-gray-500">
              <p>No more history to display</p>
            </div>
          </div>
        </ContentLayout>
      )}
    </DashboardLayout>
  )
} 