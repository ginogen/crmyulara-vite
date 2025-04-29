import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/Select';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BranchModal } from '@/components/modals/BranchModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

type Branch = {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  organization_id: string;
  status: 'active' | 'inactive';
  created_at: string;
};

const statusLabels: Record<Branch['status'], string> = {
  active: 'Activa',
  inactive: 'Inactiva',
};

const statusColors: Record<Branch['status'], { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800' },
  inactive: { bg: 'bg-red-100', text: 'text-red-800' },
};

type UserRole = 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';

export function BranchesPage() {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  // Por ahora, usaremos un rol fijo para el ejemplo
  const userRole: UserRole = 'org_admin';
  const supabase = createClient();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranches(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async (branchData: Omit<Branch, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([branchData])
        .select()
        .single();

      if (error) throw error;
      setBranches((prev) => [data, ...prev]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error en handleCreateBranch:', error);
      throw error;
    }
  };

  const handleUpdateBranch = async (branchData: Omit<Branch, 'id' | 'created_at'>) => {
    if (!selectedBranch) return;

    try {
      const { error } = await supabase
        .from('branches')
        .update(branchData)
        .eq('id', selectedBranch.id);

      if (error) throw error;
      
      setBranches((prev) => 
        prev.map((branch) => 
          branch.id === selectedBranch.id 
            ? { ...branch, ...branchData } 
            : branch
        )
      );
      
      setIsModalOpen(false);
      setSelectedBranch(undefined);
    } catch (error) {
      console.error('Error updating branch:', error);
      throw error;
    }
  };

  const handleOpenModal = (branch?: Branch) => {
    setSelectedBranch(branch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBranch(undefined);
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const filteredBranches = branches.filter((branch) => {
    const matchesStatus = filters.status ? branch.status === filters.status : true;
    const matchesSearch = filters.search
      ? branch.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        branch.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        branch.city.toLowerCase().includes(filters.search.toLowerCase()) ||
        branch.province.toLowerCase().includes(filters.search.toLowerCase())
      : true;

    return matchesStatus && matchesSearch;
  });

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
            { label: 'Sucursales' },
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
          <h1 className="text-2xl font-semibold text-gray-900">Sucursales</h1>
          <Button
            onClick={() => handleOpenModal()}
          >
            Nueva Sucursal
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
              placeholder="Buscar por nombre, ciudad o provincia"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <Select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as Branch['status'] })}
              options={[
                { value: '', label: 'Todos' },
                ...Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label
                }))
              ]}
            />
          </div>
        </div>

        {/* Tabla de Sucursales */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creada
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Cargando...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No hay sucursales disponibles
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((branch) => (
                    <tr key={branch.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div>
                          <div className="font-medium">{branch.name}</div>
                          <div className="text-gray-500">{branch.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[branch.status as Branch['status']].bg
                          } ${statusColors[branch.status as Branch['status']].text}`}
                        >
                          {statusLabels[branch.status as Branch['status']]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>{branch.address}</div>
                          <div>{branch.city}, {branch.province}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>{branch.phone}</div>
                          <div>{branch.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(branch.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleOpenModal(branch)}
                          variant="outline"
                          size="sm"
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <BranchModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          branch={selectedBranch}
          onSubmit={selectedBranch ? handleUpdateBranch : handleCreateBranch}
        />
      )}
    </>
  );
} 