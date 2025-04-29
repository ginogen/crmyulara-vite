import { BellIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// Definimos las interfaces
interface Organization {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

interface Branch {
  id: string;
  name: string;
  organization_id: string;
  description?: string;
  status?: string;
}

// Declaración de módulo para extender la interfaz AuthContextType
declare module '@/contexts/AuthContext' {
  interface AuthContextType {
    userRole: string | null;
    currentOrganization: Organization | null;
    currentBranch: Branch | null;
    organizations: Organization[];
    branches: Branch[];
    setCurrentOrganization: (org: Organization) => void;
    setCurrentBranch: (branch: Branch) => void;
  }
}

export function Topbar() {
  // Obtenemos los datos de contexto
  const { 
    user, 
    userRole, 
    currentOrganization,
    currentBranch,
    organizations = [], // Valor por defecto en caso de undefined
    branches = [], // Valor por defecto en caso de undefined
    setCurrentOrganization,
    setCurrentBranch,
    loading
  } = useAuth();

  // Manejador para cambiar organización
  const handleOrganizationChange = (selectedOrg: Organization) => {
    setCurrentOrganization(selectedOrg);
    // La función en AuthContext se encarga de seleccionar la primera sucursal
    document.getElementById('org-dropdown')?.classList.add('hidden');
  };

  // Manejador para cambiar sucursal
  const handleBranchChange = (selectedBranch: Branch) => {
    setCurrentBranch(selectedBranch);
    document.getElementById('branch-dropdown')?.classList.add('hidden');
  };

  // Determinamos quién puede cambiar qué según su rol
  const canChangeOrganization = userRole === 'super_admin';
  const canChangeBranch = userRole === 'super_admin' || userRole === 'org_admin';

  // Para depuración en consola
  useEffect(() => {
    console.log('Topbar datos disponibles:', { 
      currentOrganization, 
      currentBranch, 
      organizations: organizations?.length || 0,
      branches: branches?.length || 0,
      loading
    });
  }, [currentOrganization, currentBranch, organizations, branches, loading]);

  // Función para cerrar dropdowns al hacer clic fuera de ellos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const orgDropdown = document.getElementById('org-dropdown');
      const branchDropdown = document.getElementById('branch-dropdown');
      const orgTrigger = document.getElementById('org-trigger');
      const branchTrigger = document.getElementById('branch-trigger');
      
      if (orgDropdown && !orgDropdown.contains(event.target as Node) && 
          orgTrigger && !orgTrigger.contains(event.target as Node)) {
        orgDropdown.classList.add('hidden');
      }
      
      if (branchDropdown && !branchDropdown.contains(event.target as Node) && 
          branchTrigger && !branchTrigger.contains(event.target as Node)) {
        branchDropdown.classList.add('hidden');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* SELECTORES - Ahora con fondo más visible y borde */}
          <div className="flex items-center space-x-4">
          
            
            {/* SELECTOR DE ORGANIZACIÓN */}
            {loading ? (
              <div className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-md">
                <span className="text-gray-500">Cargando...</span>
              </div>
            ) : currentOrganization ? (
              <div className="relative">
                <button
                  id="org-trigger"
                  type="button"
                  disabled={!canChangeOrganization || organizations.length <= 1}
                  onClick={() => document.getElementById('org-dropdown')?.classList.toggle('hidden')}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md bg-blue-100 hover:bg-blue-200 focus:outline-none border border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="mr-1 text-xs text-gray-700">Organización:</span>
                  <span className="font-medium">{currentOrganization.name}</span>
                  {canChangeOrganization && organizations.length > 1 && (
                    <ChevronDownIcon className="w-4 h-4 ml-1 text-gray-600" aria-hidden="true" />
                  )}
                </button>
                
                {canChangeOrganization && organizations.length > 1 && (
                  <div
                    id="org-dropdown"
                    className="absolute left-0 z-10 mt-1 w-48 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden"
                  >
                    <div className="py-1">
                      {organizations.map((org: Organization) => (
                        <button
                          key={org.id}
                          onClick={() => handleOrganizationChange(org)}
                          className={`
                            ${currentOrganization.id === org.id ? 'bg-gray-100 font-medium' : ''}
                            group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900
                          `}
                        >
                          {org.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* SELECTOR DE SUCURSAL */}
            {loading ? (
              <div className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-md">
                <span className="text-gray-500">Cargando...</span>
              </div>
            ) : currentBranch ? (
              <div className="relative">
                <button
                  id="branch-trigger"
                  type="button"
                  disabled={!canChangeBranch || !currentOrganization || branches.filter(b => b.organization_id === currentOrganization.id).length <= 1}
                  onClick={() => document.getElementById('branch-dropdown')?.classList.toggle('hidden')}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md bg-green-100 hover:bg-green-200 focus:outline-none border border-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="mr-1 text-xs text-gray-700">Sucursal:</span>
                  <span className="font-medium">{currentBranch.name}</span>
                  {canChangeBranch && branches.filter(b => b.organization_id === currentOrganization?.id).length > 1 && (
                    <ChevronDownIcon className="w-4 h-4 ml-1 text-gray-600" aria-hidden="true" />
                  )}
                </button>
                
                {canChangeBranch && currentOrganization && branches.filter(b => b.organization_id === currentOrganization.id).length > 1 && (
                  <div
                    id="branch-dropdown"
                    className="absolute left-0 z-10 mt-1 w-48 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden"
                  >
                    <div className="py-1">
                      {branches
                        .filter((branch: Branch) => branch.organization_id === currentOrganization.id)
                        .map((branch: Branch) => (
                          <button
                            key={branch.id}
                            onClick={() => handleBranchChange(branch)}
                            className={`
                              ${currentBranch.id === branch.id ? 'bg-gray-100 font-medium' : ''}
                              group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900
                            `}
                          >
                            {branch.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          
          {/* Notificaciones y Perfil */}
          <div className="flex items-center space-x-4">
            {/* Notificaciones */}
            <button
              type="button"
              className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Ver notificaciones</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Perfil */}
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.user_metadata?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-medium text-gray-700">
                  {user?.user_metadata?.name || 'Usuario'}
                </span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 