import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  InboxIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Contactos', href: '/contacts', icon: UsersIcon },
  { name: 'Presupuestos', href: '/budgets', icon: DocumentTextIcon },
  { name: 'Bandeja', href: '/inbox', icon: InboxIcon },
  { name: 'Configuración', href: '/admin', icon: CogIcon },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-white shadow">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 h-6 w-6 ${
                    isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
} 