import { Link } from 'react-router-dom';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';

// Definimos los módulos disponibles en el admin
const modules = [
  {
    name: 'Organizaciones',
    description: 'Gestionar organizaciones y sus configuraciones',
    href: '/admin/organizations',
    icon: 'BuildingOffice', // Usamos nombres en lugar de importaciones de heroicons
    color: 'bg-blue-500',
    role: 'super_admin' as UserRole,
  },
  {
    name: 'Reglas',
    description: 'Configurar reglas de asignación automática de leads',
    href: '/rules',
    icon: 'ClipboardDocument',
    color: 'bg-indigo-500',
    role: 'org_admin' as UserRole,
  },
  {
    name: 'Sucursales',
    description: 'Administrar sucursales y sus detalles',
    href: '/admin/branches',
    icon: 'BuildingStorefront',
    color: 'bg-green-500',
    role: 'org_admin' as UserRole,
  },
  {
    name: 'Usuarios',
    description: 'Gestionar usuarios y sus roles',
    href: '/admin/users',
    icon: 'Users',
    color: 'bg-purple-500',
    role: 'org_admin' as UserRole,
  },
  {
    name: 'Mi Perfil',
    description: 'Ver y editar tu información personal',
    href: '/admin/profile',
    icon: 'User',
    color: 'bg-yellow-500',
    role: 'sales_agent' as UserRole,
  },
];

// Componente para renderizar el icono
const IconComponent = ({ icon }: { icon: string }) => {
  // Función simple para mostrar iconos basados en el nombre
  switch (icon) {
    case 'BuildingOffice':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      );
    case 'ClipboardDocument':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 0 0 2.25 2.25h.75m0-3.75h3.75M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 0 0 2.25 2.25h.75" />
        </svg>
      );
    case 'BuildingStorefront':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
        </svg>
      );
    case 'Users':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      );
    case 'User':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      );
    default:
      return null;
  }
};

export function AdminPage() {
  const { userRole } = useAuth();

  // Filtrar módulos según el rol del usuario
  const availableModules = modules.filter((module) => {
    if (userRole === 'super_admin') return true;
    if (userRole === 'org_admin') return module.role !== 'super_admin';
    if (userRole === 'branch_manager') return module.role === 'sales_agent';
    return module.role === 'sales_agent';
  });

  return (
    <>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Administración' },
          ]}
        />
        
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Administración</h1>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availableModules.map((module) => (
            <Link
              key={module.name}
              to={module.href}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg overflow-hidden hover:bg-gray-50"
            >
              <div>
                <span className={`rounded-lg inline-flex p-3 ring-4 ring-white ${module.color}`}>
                  <IconComponent icon={module.icon} />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  {module.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{module.description}</p>
              </div>
              <span
                className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                aria-hidden="true"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
} 