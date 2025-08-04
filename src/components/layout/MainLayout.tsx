import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import { Topbar } from './Topbar';
import { UserRole } from '@/types/user';
import { useState } from 'react';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { Toaster } from 'sonner';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize task notifications
  useTaskNotifications();

  // Manejar el cambio de estado de la barra lateral
  const handleSidebarToggle = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        userRole={(user?.role as UserRole) || 'sales_agent'}
        userEmail={user?.email || ''}
        userName={user?.user_metadata?.name || ''}
        onToggleCollapse={handleSidebarToggle}
      />
      
      {/* Contenido principal */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-48'}`}>
        <Topbar />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
      
      {/* Toaster for notifications */}
      <Toaster 
        position="top-right"
        expand={true}
        richColors={true}
        closeButton={true}
      />
    </div>
  );
} 