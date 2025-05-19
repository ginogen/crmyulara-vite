import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { UserModal } from '@/components/modals/UserModal';
import { createClient as createAdminClient } from '@supabase/supabase-js';

type User = {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';
  branch_id: string | null;
  organization_id: string | null;
  created_at: string;
  status: 'active' | 'inactive';
};

type UserRole = 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Admin de Organización',
  branch_manager: 'Gerente de Sucursal',
  sales_agent: 'Agente de Ventas',
};

const statusLabels: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800' },
  inactive: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    search: '',
  });
  const { user } = useAuth();
  const userRole: UserRole = 'super_admin'; // Valor fijo para pruebas
  const supabase = createClient();
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filtrar usuarios que no tengan ID
      const validUsers = (data || []).filter(user => !!user.id);
      setUsers(validUsers);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name');
    if (!error && data) setOrganizations(data);
  };

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name');
    if (!error && data) setBranches(data);
  };

  const getOrgName = (id?: string | null) => organizations.find(o => o.id === id)?.name || '';
  const getBranchName = (id?: string | null) => branches.find(b => b.id === id)?.name || '';

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleNewUser = () => {
    setSelectedUser(undefined);
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = async (form: any) => {
    try {
      if (selectedUser) {
        // Actualizar usuario existente
        const { error } = await supabase
          .from('users')
          .update({
            full_name: form.full_name,
            email: form.email,
            role: form.role,
            organization_id: form.organization_id,
            branch_id: form.branch_id,
          })
          .eq('id', selectedUser.id);
        if (error) throw error;
      } else {
        // Crear usuario nuevo usando función serverless
        const res = await fetch('/.netlify/functions/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error al crear usuario');
      }
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error al guardar usuario');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar usuario');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesRole = filters.role ? user.role === filters.role : true;
    const matchesSearch = filters.search
      ? (user.full_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(filters.search.toLowerCase())
      : true;

    return matchesRole && matchesSearch;
  });

  // Verificar si existe status y usar valores por defecto si no
  const getStatusStyles = (status?: string) => {
    if (!status || !statusColors[status]) {
      return statusColors['inactive'];
    }
    return statusColors[status];
  };

  const getStatusLabel = (status?: string) => {
    if (!status || !statusLabels[status]) {
      return 'Desconocido';
    }
    return statusLabels[status];
  };

  const getRoleLabel = (role?: string) => {
    if (!role || !(role in roleLabels)) {
      return 'Rol desconocido';
    }
    return roleLabels[role as UserRole];
  };

  // Verificación de permisos
  const hasAccess = user && ['super_admin', 'org_admin'].includes(userRole);
  if (!hasAccess) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Acceso Denegado</h2>
        <p className="mt-2 text-gray-600">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Administración', href: '/admin' },
            { label: 'Usuarios' },
          ]}
        />
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error.message}
                </h3>
              </div>
            </div>
          </div>
        )}

        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <Button onClick={handleNewUser}>
            Nuevo Usuario
          </Button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Buscar
            </label>
            <Input
              id="search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Buscar por nombre o email"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Rol
            </label>
            <Select
              value={filters.role}
              onValueChange={(value: string) => setFilters({ ...filters, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organización
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Cargando...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      No hay usuarios disponibles
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.full_name || 'Sin nombre'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email || 'Sin email'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getRoleLabel(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.organization_id ? getOrgName(user.organization_id) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.branch_id ? getBranchName(user.branch_id) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleEditUser(user.id)}
                          variant="outline"
                          size="sm"
                        >
                          Editar
                        </Button>
                        {(userRole === 'super_admin' || userRole === 'org_admin') && (
                          <Button
                            onClick={() => handleDeleteUser(user.id)}
                            variant="destructive"
                            size="sm"
                            className="ml-2"
                          >
                            Eliminar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        onSubmit={handleUserSubmit}
        organizations={organizations}
        branches={branches}
      />
    </>
  );
} 