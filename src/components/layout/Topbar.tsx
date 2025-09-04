import { BellIcon, ChevronDownIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getTodayTasks, getOverdueTasks, getUpcomingTasks } from '@/lib/utils/notifications';
import { Database } from '@/lib/supabase/database.types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  contacts?: { full_name: string };
  leads?: { name: string };
};

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

  const [tasks, setTasks] = useState<Task[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);

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

  // Cargar tareas para notificaciones
  useEffect(() => {
    if (user?.id && !loading) {
      loadUserTasks();
    }
  }, [user?.id, loading]);

  const loadUserTasks = async () => {
    if (!user?.id) return;
    
    setTasksLoading(true);
    try {
      const [todayTasks, overdueTasks, upcomingTasks] = await Promise.all([
        getTodayTasks(user.id),
        getOverdueTasks(user.id),
        getUpcomingTasks(user.id, 3) // próximos 3 días
      ]);
      
      // Combinar y ordenar tareas por fecha de vencimiento
      const allTasks = [...overdueTasks, ...todayTasks, ...upcomingTasks];
      const uniqueTasks = allTasks.filter((task, index, self) => 
        index === self.findIndex(t => t.id === task.id)
      );
      
      uniqueTasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setTasks(uniqueTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) {
      return { text: 'Vencida', color: 'text-red-600', urgent: true };
    } else if (diffHours < 1) {
      return { text: `${Math.round(diffHours * 60)}min`, color: 'text-red-500', urgent: true };
    } else if (diffHours < 24) {
      return { text: `${Math.round(diffHours)}h`, color: 'text-orange-500', urgent: false };
    } else {
      return { text: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }), color: 'text-gray-600', urgent: false };
    }
  };

  const urgentTasksCount = tasks.filter(task => {
    const dueInfo = formatDueDate(task.due_date);
    return dueInfo.urgent;
  }).length;

  // Para depuración en consola
  useEffect(() => {
    console.log('Topbar datos disponibles:', { 
      currentOrganization, 
      currentBranch, 
      organizations: organizations?.length || 0,
      branches: branches?.length || 0,
      loading,
      tasksCount: tasks.length
    });
  }, [currentOrganization, currentBranch, organizations, branches, loading, tasks.length]);

  // Función para cerrar dropdowns al hacer clic fuera de ellos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const orgDropdown = document.getElementById('org-dropdown');
      const branchDropdown = document.getElementById('branch-dropdown');
      const notificationDropdown = event.target as Element;
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
      
      // Cerrar dropdown de notificaciones
      if (!notificationDropdown.closest('.notification-dropdown')) {
        setShowNotifications(false);
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
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) loadUserTasks();
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none relative"
              >
                <span className="sr-only">Ver notificaciones</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {urgentTasksCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {urgentTasksCount > 9 ? '9+' : urgentTasksCount}
                  </span>
                )}
              </button>
              
              {/* Dropdown de notificaciones */}
              {showNotifications && (
                <div className="notification-dropdown absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1 max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900">Tareas pendientes</h3>
                      {tasksLoading && <span className="text-xs text-gray-500">Cargando...</span>}
                    </div>
                    
                    {tasks.length === 0 && !tasksLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No hay tareas pendientes
                      </div>
                    ) : (
                      tasks.slice(0, 10).map((task) => {
                        const dueInfo = formatDueDate(task.due_date);
                        let entityName = 'Sin asignar';
                        if (task.related_to_type === 'contact' && task.contacts) {
                          entityName = task.contacts.full_name;
                        } else if (task.related_to_type === 'lead' && task.leads) {
                          entityName = task.leads.name;
                        }
                        
                        return (
                          <div key={task.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {task.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {entityName}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                {dueInfo.urgent && (
                                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                                )}
                                <ClockIcon className="h-3 w-3 text-gray-400" />
                                <span className={`text-xs font-medium ${dueInfo.color}`}>
                                  {dueInfo.text}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    
                    {tasks.length > 10 && (
                      <div className="px-4 py-2 bg-gray-50 text-center">
                        <span className="text-xs text-gray-500">
                          +{tasks.length - 10} tareas más
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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