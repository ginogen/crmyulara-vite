import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lead } from '@/types/supabase';
import { formatPhoneNumber } from '@/lib/utils/strings';
import { formatDate } from '@/lib/utils/dates';
import { generateInquiryNumber } from '@/lib/utils/strings';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { LeadModal, LeadHistoryModal, LeadTasksModal, WhatsAppModal } from '@/components/modals';
import Select, { SingleValue, ActionMeta } from 'react-select';
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const statusLabels: Record<Lead['status'], string> = {
  new: 'Nuevo',
  assigned: 'Asignado',
  contacted: 'Contactado',
  followed: 'Seguido',
  interested: 'Interesado',
  reserved: 'Reservado',
  liquidated: 'Liquidado',
  effective_reservation: 'Reserva Efectiva',
};

const statusColors: Record<Lead['status'], { bg: string; text: string }> = {
  new: { bg: 'bg-gray-100', text: 'text-gray-800' },
  assigned: { bg: 'bg-blue-100', text: 'text-blue-800' },
  contacted: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  followed: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  interested: { bg: 'bg-green-100', text: 'text-green-800' },
  reserved: { bg: 'bg-purple-100', text: 'text-purple-800' },
  liquidated: { bg: 'bg-red-100', text: 'text-red-800' },
  effective_reservation: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

export function LeadsPage() {
  const { user, currentOrganization, currentBranch, userRole, loading } = useAuth();
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    search: '',
    name: '',
    phone: '',
    origin: '',
    pax: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState<string | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string }>>([]);
  const [leadsWithTasks, setLeadsWithTasks] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [activeFilters, setActiveFilters] = useState<Array<{ field: string; value: string }>>([]);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedLeadForWA, setSelectedLeadForWA] = useState<Lead | null>(null);

  const {
    leads,
    loading: isLoading,
    createLead: createLeadMutation,
    updateLead: updateLeadMutation,
    updateLeadStatus,
    updateLeadAssignment,
    deleteLead,
  } = useLeads(currentOrganization?.id, currentBranch?.id);

  useEffect(() => {
    const fetchAgents = async () => {
      if (!currentOrganization?.id || !currentBranch?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('organization_id', currentOrganization.id)
          .eq('branch_id', currentBranch.id);

        if (error) throw error;
        setAgents(data || []);
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, [currentOrganization?.id, currentBranch?.id]);

  useEffect(() => {
    const fetchLeadsWithTasks = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('related_to_id')
          .eq('related_to_type', 'lead')
          .eq('organization_id', currentOrganization.id);
        
        if (error) throw error;
        
        const leadIdsWithTasks = new Set<string>(data.map((task: { related_to_id: string }) => task.related_to_id));
        setLeadsWithTasks(leadIdsWithTasks);
      } catch (error) {
        console.error('Error al obtener leads con tareas:', error);
      }
    };

    fetchLeadsWithTasks();
  }, [currentOrganization?.id]);

  const handleCreateLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'inquiry_number'>) => {
    if (loading) {
      console.log('Sistema cargando, espere por favor');
      return;
    }

    if (!user?.id || !currentOrganization?.id || !currentBranch?.id) {
      const errorMsg = 'No se puede crear el lead porque faltan datos requeridos';
      console.error(errorMsg, { 
        userId: user?.id, 
        organizationId: currentOrganization?.id, 
        branchId: currentBranch?.id 
      });
      throw new Error(errorMsg);
    }

    try {
      const inquiryNumber = generateInquiryNumber();
      await createLeadMutation.mutateAsync({
        ...leadData,
        inquiry_number: inquiryNumber,
        organization_id: currentOrganization.id,
        branch_id: currentBranch.id,
        assigned_to: user.id,
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error en handleCreateLead:', error);
      throw error;
    }
  };

  const handleUpdateLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'inquiry_number'>) => {
    if (!selectedLead || !currentOrganization?.id || !currentBranch?.id) return;

    try {
      await updateLeadMutation.mutateAsync({
        id: selectedLead.id,
        ...leadData,
        organization_id: currentOrganization.id,
        branch_id: currentBranch.id,
        inquiry_number: selectedLead.inquiry_number,
      });
      setIsModalOpen(false);
      setSelectedLead(undefined);
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleOpenModal = (lead?: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(undefined);
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      // Estados que convierten un lead en contacto
      const contactStates: Lead['status'][] = ['contacted', 'followed', 'interested', 'reserved', 'liquidated', 'effective_reservation'];
      
      // Mostrar un mensaje de confirmación si es un estado que convierte a contacto
      if (contactStates.includes(newStatus)) {
        const confirm = window.confirm(
          `Al cambiar el estado a "${statusLabels[newStatus]}", el lead será convertido a contacto y desaparecerá de esta lista. ¿Desea continuar?`
        );
        
        if (!confirm) {
          setIsStatusMenuOpen(null);
          return;
        }
      }
      
      await updateLeadStatus.mutateAsync({ leadId, status: newStatus });
      
      if (contactStates.includes(newStatus)) {
        toast.success('Lead convertido a contacto exitosamente');
      } else {
        toast.success('Estado actualizado exitosamente');
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Error al actualizar el estado del lead');
    }
    setIsStatusMenuOpen(null);
  };

  const handleAssignmentChange = async (leadId: string, newAgentId: string) => {
    try {
      await updateLeadAssignment.mutateAsync({
        leadId,
        agentId: newAgentId === 'unassigned' ? null : newAgentId,
      });
    } catch (error) {
      console.error('Error updating lead assignment:', error);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    return (
      (filters.status === 'all' || !filters.status ? true : lead.status === filters.status) &&
      (filters.assignedTo === 'all' || !filters.assignedTo ? true : lead.assigned_to === filters.assignedTo) &&
      (filters.name ? lead.full_name.toLowerCase().includes(filters.name.toLowerCase()) : true) &&
      (filters.phone ? formatPhoneNumber(lead.phone).includes(filters.phone) : true) &&
      (filters.origin ? lead.origin.toLowerCase().includes(filters.origin.toLowerCase()) : true) &&
      (filters.pax ? lead.pax_count.toString().includes(filters.pax) : true) &&
      (filters.search ? lead.full_name.toLowerCase().includes(filters.search.toLowerCase()) || formatPhoneNumber(lead.phone).includes(filters.search) : true)
    );
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    if (value) {
      setActiveFilters(prev => {
        // Elimina el filtro anterior de ese campo y agrega el nuevo
        const filtered = prev.filter(f => f.field !== field);
        return [...filtered, { field, value }];
      });
    } else {
      setActiveFilters(prev => prev.filter(f => f.field !== field));
    }
  };

  const removeFilter = (field: string) => {
    setFilters(prev => ({ ...prev, [field]: '' }));
    setActiveFilters(prev => prev.filter(f => f.field !== field));
  };

  const handleBulkAssign = async (agentId: string) => {
    try {
      await Promise.all(
        selectedLeads.map(lead =>
          updateLeadAssignment.mutateAsync({
            leadId: lead.id,
            agentId: agentId === 'unassigned' ? null : agentId,
          })
        )
      );
      setSelectedLeads([]);
      toast.success('Leads asignados correctamente');
    } catch (error) {
      toast.error('Error al asignar los leads');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-full p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-x-2 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 rounded-md"
            >
              <svg className="-ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Nuevo Lead
            </button>
          </div>
        </div>
        {/* Asignación múltiple */}
        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <Select
              options={agents.map(agent => ({ value: agent.id, label: agent.full_name }))}
              onChange={option => {
                if (option && option.value) {
                  handleBulkAssign(option.value);
                }
              }}
              placeholder="Asignar a..."
              className="w-60"
              isSearchable
            />
            <span className="text-xs">{selectedLeads.length} leads seleccionados</span>
            <button
              className="text-xs text-gray-500 hover:text-gray-700 ml-2"
              onClick={() => setSelectedLeads([])}
            >
              Limpiar selección
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium">Filtros</h2>
          {activeFilters.length > 0 && (
            <button
              onClick={() => {
                setFilters({ status: '', assignedTo: '', search: '', name: '', phone: '', origin: '', pax: '' });
                setActiveFilters([]);
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Limpiar todos
            </button>
          )}
        </div>

        {/* Resumen de filtros y resultados */}
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-700">Estás viendo:</span>
              {activeFilters.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filter, index) => (
                    <span key={index} className="text-xs text-gray-600">
                      {filter.field === 'status' ? 'Estado' :
                       filter.field === 'assignedTo' ? 'Asignado a' :
                       filter.field === 'search' ? 'Búsqueda' : filter.field}: {filter.value}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-500">Todos los leads</span>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700">
              {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'} encontrados
            </span>
          </div>
        </div>

        {/* Indicadores de filtros activos */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map((filter, index) => (
              <div key={index} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-xs">
                <span className="text-blue-700">
                  {filter.field === 'status' ? 'Estado' :
                   filter.field === 'assignedTo' ? 'Asignado a' :
                   filter.field === 'search' ? 'Búsqueda' : filter.field}: {filter.value}
                </span>
                <button
                  onClick={() => removeFilter(filter.field)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Nombre
            </label>
            <Input
              placeholder="Buscar por nombre..."
              value={filters.name || ''}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Teléfono
            </label>
            <Input
              placeholder="Buscar por teléfono..."
              value={filters.phone || ''}
              onChange={(e) => handleFilterChange('phone', e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Origen
            </label>
            <Input
              placeholder="Buscar por origen..."
              value={filters.origin || ''}
              onChange={(e) => handleFilterChange('origin', e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Pax
            </label>
            <Input
              placeholder="Buscar por pax..."
              value={filters.pax || ''}
              onChange={(e) => handleFilterChange('pax', e.target.value)}
              className="text-xs"
              type="number"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Estado
            </label>
            <Select
              options={[
                { value: 'all', label: 'Todos los estados' },
                ...Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label
                }))
              ]}
              value={filters.status ? { value: filters.status, label: statusLabels[filters.status as Lead['status']] } : { value: 'all', label: 'Todos los estados' }}
              onChange={(option: { value: string; label: string } | null) => handleFilterChange('status', option?.value || '')}
              className="text-xs"
              classNamePrefix="select"
              placeholder="Seleccionar estado..."
              isClearable
              isSearchable
            />
          </div>

          {userRole !== 'sales_agent' && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Asignado a
              </label>
              <Select
                options={[
                  { value: 'all', label: 'Todos los agentes' },
                  ...agents.map(agent => ({ value: agent.id, label: agent.full_name }))
                ]}
                value={agents.find(agent => agent.id === filters.assignedTo) ? 
                  { value: filters.assignedTo, label: agents.find(agent => agent.id === filters.assignedTo)?.full_name } :
                  { value: 'all', label: 'Todos los agentes' }
                }
                onChange={(newValue: SingleValue<{ value: string; label: string | undefined }>) => 
                  handleFilterChange('assignedTo', newValue?.value || '')}
                className="text-xs"
                classNamePrefix="select"
                placeholder="Seleccionar agente..."
                isClearable
                isSearchable
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Buscar
            </label>
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Leads */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedLeads(paginatedLeads);
                      } else {
                        setSelectedLeads([]);
                      }
                    }}
                  />
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Viaje</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pax</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado A</th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-4">
                    <div className="flex justify-center items-center space-x-2">
                      <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-xs text-gray-500">
                    No hay leads disponibles
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.some(l => l.id === lead.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedLeads([...selectedLeads, lead]);
                          } else {
                            setSelectedLeads(selectedLeads.filter(l => l.id !== lead.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{lead.full_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      <DropdownMenu open={isStatusMenuOpen === lead.id} onOpenChange={() => setIsStatusMenuOpen(lead.id)}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-full justify-start p-1">
                            <Badge
                              variant="secondary"
                              className={`${statusColors[lead.status as Lead['status']].bg} ${statusColors[lead.status as Lead['status']].text} px-2 py-0.5 text-xs rounded`}
                            >
                              {statusLabels[lead.status as Lead['status']]}
                            </Badge>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <DropdownMenuItem
                              key={value}
                              onClick={() => handleStatusChange(lead.id, value as Lead['status'])}
                              className="py-1"
                            >
                              <Badge
                                variant="secondary"
                                className={`${statusColors[value as Lead['status']].bg} ${statusColors[value as Lead['status']].text} px-2 py-0.5 text-xs rounded`}
                              >
                                {label}
                              </Badge>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                      <div className="flex items-center gap-2">
                        {formatPhoneNumber(lead.phone)}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedLeadForWA(lead);
                            setIsWhatsAppModalOpen(true);
                          }}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 448 512"
                            fill="currentColor"
                            className="w-4 h-4 text-green-600"
                          >
                            <path
                              d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                      <div className="max-w-[120px] truncate" title={lead.origin}>
                        {lead.origin}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{formatDate(lead.estimated_travel_date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{lead.pax_count}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-full justify-start p-1 hover:bg-gray-100">
                            <span className="text-gray-900">
                              {lead.assigned_to ? 
                                agents.find(agent => agent.id === lead.assigned_to)?.full_name :
                                'Sin asignar'
                              }
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                          <DropdownMenuItem
                            onClick={() => handleAssignmentChange(lead.id, 'unassigned')}
                            className="py-1"
                          >
                            Sin asignar
                          </DropdownMenuItem>
                          {agents.map(agent => (
                            <DropdownMenuItem
                              key={agent.id}
                              onClick={() => handleAssignmentChange(lead.id, agent.id)}
                              className="py-1"
                            >
                              {agent.full_name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleOpenModal(lead)} className="cursor-pointer py-1">
                            <svg className="mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsHistoryModalOpen(true);
                            }}
                            className="cursor-pointer py-1"
                          >
                            <svg className="mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                            </svg>
                            Historial
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsTasksModalOpen(true);
                            }}
                            className="cursor-pointer py-1"
                          >
                            <svg className="mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Tareas
                          </DropdownMenuItem>
                          {userRole === 'super_admin' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                if (window.confirm('¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.')) {
                                  try {
                                    await deleteLead.mutateAsync({ id: lead.id, userRole });
                                    toast.success('Lead eliminado correctamente');
                                  } catch (error: any) {
                                    toast.error(error.message || 'Error al eliminar el lead');
                                  }
                                }
                              }}
                              className="cursor-pointer py-1 text-red-600 hover:bg-red-50"
                            >
                              <svg className="mr-2 h-3 w-3 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm2 5a1 1 0 000 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
                              </svg>
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t">
          <div className="flex items-center">
            <span className="text-xs text-gray-700">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredLeads.length)} de {filteredLeads.length} resultados
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-xs text-gray-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {isModalOpen && (
        <LeadModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          lead={selectedLead}
          onSubmit={selectedLead ? handleUpdateLead : handleCreateLead}
          initialData={selectedLead}
        />
      )}

      {isHistoryModalOpen && (
        <LeadHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          leadId={selectedLead?.id || ''}
        />
      )}

      {isTasksModalOpen && (
        <LeadTasksModal
          isOpen={isTasksModalOpen}
          onClose={() => setIsTasksModalOpen(false)}
          leadId={selectedLead?.id || ''}
        />
      )}

      {/* WhatsApp Modal */}
      {selectedLeadForWA && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setSelectedLeadForWA(null);
          }}
          contact={{
            id: selectedLeadForWA.id,
            full_name: selectedLeadForWA.full_name,
            phone: selectedLeadForWA.phone,
          }}
        />
      )}
    </div>
  );
} 