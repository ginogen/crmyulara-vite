import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import Header from '../components/dashboard/Header'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, userRole } = useAuth()

  // Asegurarnos de que userRole sea uno de los valores permitidos
  const validRole = (userRole === 'super_admin' || 
                    userRole === 'org_admin' || 
                    userRole === 'branch_manager' || 
                    userRole === 'sales_agent') 
                    ? userRole 
                    : 'sales_agent';

  console.log('User Role in DashboardLayout:', userRole, 'Valid Role:', validRole);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={validRole}
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