import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  HomeIcon,
  UserGroupIcon,
  UserPlusIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from '@/lib/utils';

interface SidebarProps {
  userRole: 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';
  userEmail: string;
  userName: string;
  organizationLogo?: string;
  userProfilePic?: string;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function Sidebar({ userRole, userEmail, userName, organizationLogo, userProfilePic, onToggleCollapse }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Contactos', href: '/contacts', icon: UserGroupIcon },
    { name: 'Leads', href: '/leads', icon: UserPlusIcon },
    { name: 'Presupuestos', href: '/budgets', icon: DocumentTextIcon },
    ...(userRole !== 'sales_agent'
      ? [{ name: 'Administración', href: '/admin', icon: Cog6ToothIcon }]
      : []),
  ];

  // Comunicar el estado de expansión al componente padre
  useEffect(() => {
    if (onToggleCollapse) {
      onToggleCollapse(isCollapsed);
    }
  }, [isCollapsed, onToggleCollapse]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await signOut();
      }
      
      navigate('/auth/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/auth/login');
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={clsx(
      "flex flex-col fixed top-0 z-40 left-0 h-full transition-[width] duration-300 ease-in-out bg-[#121725] text-white border-r border-gray-800",
      isCollapsed ? "w-16" : "w-48",
    )}>
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <img
              className="h-6 w-6"
              src="/logo.png"
              alt="Logo"
            />
          </div>
          {!isCollapsed && (
            <div className="ml-2">
              <div className="text-xs font-medium">Yulara CRM</div>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-md hover:bg-gray-700 p-1"
        >
          {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex flex-col flex-grow overflow-y-auto">
        <div className="space-y-2 px-2 py-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  "flex items-center group rounded-md px-2 py-1.5 text-xs font-medium",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <item.icon
                  className={clsx(
                    isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-white",
                    "h-5 w-5 flex-shrink-0"
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="ml-2 text-xs">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-2 border-t border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <img
              className="h-6 w-6 rounded-full bg-gray-300"
              src={userProfilePic || "/user-placeholder.png"}
              alt="User"
            />
          </div>
          {!isCollapsed && (
            <div className="ml-2 overflow-hidden">
              <div className="text-xs font-medium truncate">{userName}</div>
              <div className="text-xs text-gray-400 truncate">{userEmail}</div>
            </div>
          )}
        </div>
        
        <button
          onClick={handleSignOut}
          className={clsx(
            "mt-2 flex w-full items-center rounded-md px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
          )}
        >
          <ArrowRightOnRectangleIcon
            className="h-5 w-5 text-gray-400 group-hover:text-white"
            aria-hidden="true"
          />
          {!isCollapsed && <span className="ml-2 text-xs">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
} 