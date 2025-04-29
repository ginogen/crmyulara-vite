import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import Header from '../components/dashboard/Header'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user } = useAuth()

  const userRole = user?.role as 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent' || 'sales_agent'

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={userRole}
        userEmail={user?.email || ''}
        userName={user?.user_metadata?.name || ''}
        userProfilePic={user?.user_metadata?.avatar_url}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
} 