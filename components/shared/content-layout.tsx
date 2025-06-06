"use client"

interface ContentLayoutProps {
  title: string;
  description?: string;
  user: any;
  children: React.ReactNode;
}

export function ContentLayout({ title, description, user, children }: ContentLayoutProps) {
  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Header with user info */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="font-medium">{user?.displayName || "Dr. Thomas Müller"}</p>
            <p className="text-sm text-gray-500">Physician</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
            {user?.displayName?.[0] || "T"}
          </div>
        </div>
      </div>

      {/* Section header */}
      <div className="mb-6">
        <h1 className="text-[36px] font-semibold text-gray-800 font-[600]">{title}</h1>
        {description && <p className="text-gray-600 mt-2">{description}</p>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {children}
      </div>
    </div>
  )
} 