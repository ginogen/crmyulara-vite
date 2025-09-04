import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lead } from '@/types/supabase';
import { formatPhoneNumber } from '@/lib/utils/strings';
import { formatDate } from '@/lib/utils/dates';
import { generateInquiryNumber } from '@/lib/utils/strings';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { LeadModal, LeadHistoryModal, LeadTasksModal, WhatsAppModal, MakeIntegrationModal, BudgetModal } from '@/components/modals';
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
import Papa from 'papaparse';
import { useBudgets } from '@/hooks/useBudgets';
import type { Database } from '@/lib/supabase/database.types';
import { useNavigate } from 'react-router-dom';

const statusLabels: Record<Lead['status'], string> = {
  new: 'Nuevo',
  assigned: 'Asignado',
  contacted: 'Contactado',
  followed: 'Seguido',
  interested: 'Interesado',
  reserved: 'Reservado',
  liquidated: 'Liquidado',
  effective_reservation: 'Reserva Efectiva',
  archived: 'Archivado',
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
  archived: { bg: 'bg-gray-300', text: 'text-gray-600' },
};

// Agregar el tipo para el modal de CSV
interface CSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => void;
}

// Componente Modal para la carga de CSV
const CSVUploadModal: React.FC<CSVModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setFile(file);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/leads-template.csv';
    link.download = 'plantilla-leads.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Por favor seleccione un archivo CSV');
      return;
    }

    setLoading(true);
    Papa.parse(file, {
      complete: (results) => {
        setLoading(false);
        if (results.data.length > 0) {
          onUpload(results.data);
          onClose();
        } else {
          toast.error('El archivo CSV está vacío');
        }
      },
      header: true,
      error: (error) => {
        setLoading(false);
        toast.error('Error al procesar el archivo CSV');
        console.error('Error parsing CSV:', error);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Cargar Leads desde CSV</h2>
        
        {/* Instrucciones y plantilla */}
        <div className="mb-6 bg-blue-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Instrucciones:</h3>
          <ol className="text-xs text-blue-700 list-decimal pl-4 space-y-1">
            <li>Descarga la plantilla CSV de ejemplo</li>
            <li>Llena los datos siguiendo el formato de la plantilla</li>
            <li>Los campos nombre y teléfono son obligatorios</li>
            <li>Guarda el archivo en formato CSV</li>
            <li>Sube el archivo usando el botón de selección</li>
          </ol>
          <button
            onClick={handleDownloadTemplate}
            className="mt-3 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 inline-flex items-center"
          >
            <svg 
              className="w-4 h-4 mr-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Descargar Plantilla CSV
          </button>
        </div>

        {/* Selector de archivo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-xs text-gray-500">
              Archivo seleccionado: {file.name}
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || loading}
          >
            {loading ? 'Procesando...' : 'Cargar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Agregar el componente Modal para archivar leads
interface ArchiveLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  leadName: string;
}

const ArchiveLeadModal: React.FC<ArchiveLeadModalProps> = ({ isOpen, onClose, onConfirm, leadName }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim() || undefined);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error archivando lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Archivar Lead</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            ¿Estás seguro de que deseas archivar el lead de <strong>{leadName}</strong>?
          </p>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Razón para archivar (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Escribe el motivo por el cual se está archivando este lead..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {reason.length}/500 caracteres
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {isSubmitting ? 'Archivando...' : 'Archivar Lead'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export function LeadsPage() {
  const { user, currentOrganization, currentBranch, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    search: '',
    name: '',
    email: '',
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeFilters, setActiveFilters] = useState<Array<{ field: string; value: string }>>([]);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [selectAllLeads, setSelectAllLeads] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedLeadForWA, setSelectedLeadForWA] = useState<Lead | null>(null);
  const [isMakeModalOpen, setIsMakeModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'activos' | 'archivados'>('activos');
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  
  // Agregar estados para el modal de archivado
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [leadToArchive, setLeadToArchive] = useState<{ id: string; name: string } | null>(null);
  
  // Estados para el modal de presupuesto
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [selectedLeadForBudget, setSelectedLeadForBudget] = useState<Lead | null>(null);

  const {
    leads,
    loading: isLoading,
    createLead: createLeadMutation,
    updateLead: updateLeadMutation,
    updateLeadStatus,
    updateLeadAssignment,
    deleteLead,
  } = useLeads(currentOrganization?.id, currentBranch?.id);

  // Hook para presupuestos
  const { createBudget } = useBudgets(currentOrganization?.id, currentBranch?.id);

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
      // Si el nuevo estado es "archived", mostrar el modal de archivado
      if (newStatus === 'archived') {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) {
          toast.error('Lead no encontrado');
          setIsStatusMenuOpen(null);
          return;
        }
        
        setLeadToArchive({ id: leadId, name: lead.full_name });
        setIsArchiveModalOpen(true);
        setIsStatusMenuOpen(null);
        return;
      }

      // Para otros estados, mostrar confirmación normal
      const confirm = window.confirm(
        `¿Estás seguro de que deseas cambiar el estado a "${statusLabels[newStatus]}"?`
      );
      
      if (!confirm) {
        setIsStatusMenuOpen(null);
        return;
      }

      // Buscar el lead actual
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        toast.error('Lead no encontrado');
        setIsStatusMenuOpen(null);
        return;
      }
      
      // Actualizar el estado usando el hook useLeads
      await updateLeadStatus.mutateAsync({ 
        leadId, 
        status: newStatus 
      });
      
      // Estados que convierten un lead en contacto
      const contactStates: Lead['status'][] = ['contacted', 'followed', 'interested', 'reserved', 'liquidated', 'effective_reservation'];

      if (contactStates.includes(newStatus)) {
        if (lead.assigned_to) {
          toast.success('Lead convertido a contacto exitosamente');
        } else {
          toast.info('Estado actualizado. Nota: El lead necesita un agente asignado para ser convertido a contacto.');
        }
      } else {
        toast.success('Estado actualizado exitosamente');
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Error al actualizar el estado del lead');
    }
    setIsStatusMenuOpen(null);
  };

  // Nueva función para manejar el archivado con comentario
  const handleArchiveLead = async (reason?: string) => {
    if (!leadToArchive) return;

    try {
      // Actualizar el lead con estado archived y la razón
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'archived',
          archived_reason: reason || null,
          archived_at: new Date().toISOString(),
        })
        .eq('id', leadToArchive.id);

      if (error) throw error;

      // Crear entrada en el historial si existe la tabla lead_history
      try {
        const historyDescription = reason 
          ? `Lead archivado. Motivo: ${reason}`
          : 'Lead archivado sin motivo específico';
          
        await supabase
          .from('lead_history')
          .insert([{
            lead_id: leadToArchive.id,
            action: 'lead_archived',
            description: historyDescription,
            user_id: user?.id,
          }]);
      } catch (historyError) {
        // Si la tabla lead_history no existe, solo loggeamos el error sin fallar la operación
        console.log('Tabla lead_history no existe o error al crear entrada:', historyError);
      }

      // Actualizar el estado local usando el hook
      await updateLeadStatus.mutateAsync({ 
        leadId: leadToArchive.id, 
        status: 'archived' 
      });

      toast.success('Lead archivado correctamente');
      setLeadToArchive(null);
    } catch (error) {
      console.error('Error archiving lead:', error);
      toast.error('Error al archivar el lead');
      throw error;
    }
  };

  const handleAssignmentChange = async (leadId: string, newAgentId: string) => {
    try {
      // Buscar el lead actual
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      // Si se desasigna (antes tenía agente)
      if (lead.assigned_to && newAgentId === 'unassigned') {
        await Promise.all([
          // Desasignar el agente
          updateLeadAssignment.mutateAsync({
            leadId,
            agentId: null,
          }),
          // Volver el estado a "new"
          updateLeadStatus.mutateAsync({ 
            leadId, 
            status: 'new' 
          })
        ]);
        toast.success('Lead desasignado y estado actualizado a Nuevo');
      } else if (!lead.assigned_to && newAgentId !== 'unassigned') {
        // Si se asigna un agente (antes estaba sin asignar)
        await Promise.all([
          // Asignar el agente
          updateLeadAssignment.mutateAsync({
            leadId,
            agentId: newAgentId,
          }),
          // Cambiar el estado a 'assigned'
          updateLeadStatus.mutateAsync({ 
            leadId, 
            status: 'assigned' 
          })
        ]);

        // Verificar si ya existe un contacto
        const { data: existingContacts, error } = await supabase
          .from('contacts')
          .select('id')
          .eq('original_lead_id', leadId);

        if (error) {
          console.error('Error consultando contactos:', error);
        }

        // Solo crear el contacto si no existe
        if (!existingContacts || existingContacts.length === 0) {
          const { error: contactError } = await supabase
            .from('contacts')
            .insert([{
              full_name: lead.full_name,
              email: null,
              phone: lead.phone,
              city: lead.province,
              province: lead.province,
              tag: 'assigned',
              organization_id: lead.organization_id,
              branch_id: lead.branch_id,
              assigned_to: newAgentId,
              origin: lead.origin,
              pax_count: lead.pax_count,
              estimated_travel_date: lead.estimated_travel_date,
              original_lead_id: lead.id,
              original_lead_status: 'assigned',
              original_lead_inquiry_number: lead.inquiry_number,
            }]);

          if (contactError) {
            console.error('Error creando contacto:', contactError);
          } else {
            toast.info('El lead ha sido convertido en contacto y ahora aparece en la lista de Contactos.');
          }
        }

        toast.success('Lead asignado correctamente');
      } else if (lead.assigned_to && newAgentId !== 'unassigned') {
        // Cambio de un agente a otro
        await updateLeadAssignment.mutateAsync({
          leadId,
          agentId: newAgentId,
        });
        toast.success('Lead reasignado');
      }
    } catch (error) {
      console.error('Error updating lead assignment:', error);
      toast.error('Error al actualizar la asignación del lead');
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const isArchived = lead.status === 'archived';
    if (activeTab === 'archivados') return isArchived;
    // En activos, mostrar todos menos los archivados
    return !isArchived && (
      (filters.status === 'all' || !filters.status ? true : lead.status === filters.status) &&
      (filters.assignedTo === 'all' || !filters.assignedTo ? true : lead.assigned_to === filters.assignedTo) &&
      (filters.name ? lead.full_name.toLowerCase().includes(filters.name.toLowerCase()) : true) &&
      (filters.email ? (lead.email || '').toLowerCase().includes(filters.email.toLowerCase()) : true) &&
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
      const leadsToUpdate = selectAllLeads ? filteredLeads : selectedLeads;
      
      // Mostrar confirmación con el número de leads
      const confirmMessage = `¿Estás seguro de que deseas ${
        agentId === 'unassigned' ? 'desasignar' : 'asignar'
      } ${leadsToUpdate.length} leads${
        agentId === 'unassigned' ? '' : ' al agente seleccionado'
      }?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      // Si se está desasignando, actualizar tanto la asignación como el estado
      if (agentId === 'unassigned') {
        await Promise.all(
          leadsToUpdate.flatMap(lead => [
            // Desasignar el agente
            updateLeadAssignment.mutateAsync({
              leadId: lead.id,
              agentId: null,
            }),
            // Volver el estado a "new"
            updateLeadStatus.mutateAsync({
              leadId: lead.id,
              status: 'new'
            })
          ])
        );
      } else {
        // Si se está asignando a un agente
        await Promise.all(
          leadsToUpdate.flatMap(lead => [
            // Asignar el agente
            updateLeadAssignment.mutateAsync({
              leadId: lead.id,
              agentId,
            }),
            // Cambiar el estado a 'assigned' si no lo está
            lead.status !== 'assigned' && updateLeadStatus.mutateAsync({
              leadId: lead.id,
              status: 'assigned'
            })
          ].filter(Boolean))
        );
      }
      
      setSelectedLeads([]);
      setSelectAllLeads(false);
      toast.success(
        `${leadsToUpdate.length} leads ${agentId === 'unassigned' 
          ? 'desasignados y estado actualizado a Nuevo' 
          : 'asignados'} correctamente`
      );
    } catch (error) {
      console.error('Error en asignación masiva:', error);
      toast.error('Error al asignar los leads');
    }
  };

  // Función para crear presupuesto desde lead
  const handleCreateBudgetFromLead = async (budgetData: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at'>) => {
    try {
      if (!selectedLeadForBudget || !currentOrganization?.id || !currentBranch?.id || !user?.id) {
        toast.error('Faltan datos requeridos para crear el presupuesto');
        return;
      }

      const newBudget = {
        ...budgetData,
        organization_id: currentOrganization.id,
        branch_id: currentBranch.id,
        assigned_to: user.id,
        lead_id: selectedLeadForBudget.id,
        // Agregar información del lead como referencia
        description: `${budgetData.description}\n\nCreado desde Lead: ${selectedLeadForBudget.full_name} (${selectedLeadForBudget.inquiry_number})`,
      };

      const createdBudget = await createBudget.mutateAsync(newBudget);
      
      // Registrar en historial del lead
      if (user?.id) {
        const supabase = createClient();
        await supabase.from('lead_history').insert({
          lead_id: selectedLeadForBudget.id,
          user_id: user.id,
          action: 'budget_created',
          description: `Presupuesto creado: "${createdBudget.title}" - ${createdBudget.amount || 0} (ID: ${createdBudget.id})`,
        });
      }
      
      toast.success('Presupuesto creado correctamente');
      setIsBudgetModalOpen(false);
      setSelectedLeadForBudget(null);
      
      // Redirigir a la página de presupuestos con el presupuesto recién creado en modo edición
      navigate('/budgets', { 
        state: { 
          editBudget: createdBudget,
          openEditor: true 
        } 
      });
    } catch (error) {
      console.error('Error creating budget from lead:', error);
      toast.error('Error al crear el presupuesto');
    }
  };

  // Función para procesar los leads del CSV
  const handleCSVUpload = async (data: any[]) => {
    try {
      if (!currentOrganization?.id || !currentBranch?.id) {
        toast.error('No se puede importar leads sin una organización y sucursal seleccionada');
        return;
      }

      const processedLeads = data.map(row => ({
        full_name: String(row.full_name || row.nombre || ''),
        phone: String(row.phone || row.telefono || ''),
        origin: String(row.origin || row.origen || ''),
        pax_count: parseInt(row.pax_count || row.pax || '0'),
        estimated_travel_date: row.estimated_travel_date || row.fecha_viaje || null,
        organization_id: currentOrganization.id,
        branch_id: currentBranch.id,
        inquiry_number: generateInquiryNumber(),
        status: 'new' as Lead['status'],
        assigned_to: null,
        province: String(row.province || row.provincia || ''),
        converted_to_contact: false,
        email: String(row.email || ''),
        archived_reason: null,
        archived_at: null,
      }));

      // Validar datos requeridos
      const invalidLeads = processedLeads.filter(lead => !lead.full_name || !lead.phone);
      if (invalidLeads.length > 0) {
        toast.error(`${invalidLeads.length} leads no tienen nombre o teléfono`);
        return;
      }

      // Crear los leads
      for (const lead of processedLeads) {
        await createLeadMutation.mutateAsync(lead);
      }

      toast.success(`${processedLeads.length} leads importados correctamente`);
    } catch (error) {
      console.error('Error importing leads:', error);
      toast.error('Error al importar los leads');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-full p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCSVModalOpen(true)}
              className="inline-flex items-center gap-x-2 bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 rounded-md"
            >
              <svg 
                className="h-5 w-5" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16M16 12L12 16M12 16L8 12M12 16L12 4" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"/>
              </svg>
              Importar CSV
            </button>
            <button
              onClick={() => setIsMakeModalOpen(true)}
              className="inline-flex items-center gap-x-2 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 rounded-md"
            >
              <svg 
                className="h-5 w-5" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 15V17M12 7V13M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"/>
              </svg>
              Configurar Make
            </button>
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
        {(selectedLeads.length > 0 || selectAllLeads) && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Select
                options={[
                  { value: 'unassigned', label: 'Sin asignar' },
                  ...agents.map(agent => ({ value: agent.id, label: agent.full_name }))
                ]}
                onChange={option => {
                  if (option && option.value) {
                    handleBulkAssign(option.value);
                  }
                }}
                placeholder="Asignar a..."
                className="w-60"
                isSearchable
              />
            </div>
            <span className="text-sm text-blue-700 font-medium">
              {selectAllLeads 
                ? `Todos los leads (${filteredLeads.length}) seleccionados` 
                : `${selectedLeads.length} leads seleccionados`
              }
            </span>
            <button
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={() => {
                setSelectedLeads([]);
                setSelectAllLeads(false);
              }}
            >
              Limpiar selección
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-medium">Filtros</h2>
          <button
            className="text-xs text-blue-600 hover:underline focus:outline-none"
            onClick={() => setIsFiltersOpen(open => !open)}
          >
            {isFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>
        {isFiltersOpen && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div></div>
              {activeFilters.length > 0 && (
                <button
                  onClick={() => {
                    setFilters({ status: '', assignedTo: '', search: '', name: '', email: '', phone: '', origin: '', pax: '' });
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
                           filter.field === 'search' ? 'Búsqueda' :
                           filter.field === 'email' ? 'Email' : filter.field}: {filter.value}
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
                       filter.field === 'search' ? 'Búsqueda' :
                       filter.field === 'email' ? 'Email' : filter.field}: {filter.value}
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
                  Email
                </label>
                <Input
                  placeholder="Buscar por email..."
                  value={filters.email || ''}
                  onChange={(e) => handleFilterChange('email', e.target.value)}
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
          </>
        )}
      </div>

      {/* Tabs arriba de la tabla */}
      <div className="flex gap-2 mb-2">
        <button
          className={`px-4 py-2 rounded-t-md font-semibold text-sm border-b-2 ${activeTab === 'activos' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 bg-gray-100'}`}
          onClick={() => setActiveTab('activos')}
        >
          Leads activos
        </button>
        <button
          className={`px-4 py-2 rounded-t-md font-semibold text-sm border-b-2 ${activeTab === 'archivados' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 bg-gray-100'}`}
          onClick={() => setActiveTab('archivados')}
        >
          Archivados
        </button>
      </div>

      {/* Tabla de Leads */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
        {/* Selector de cantidad por página */}
        <div className="flex items-center justify-end px-4 py-2 bg-gray-50 border-b">
          <label className="text-xs mr-2">Leads por página:</label>
          <select
            className="text-xs border rounded px-2 py-1"
            value={itemsPerPage}
            onChange={e => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[10, 20, 30, 50, 100].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAllLeads || (selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0)}
                      ref={checkbox => {
                        if (checkbox) {
                          checkbox.indeterminate = selectedLeads.length > 0 && selectedLeads.length < paginatedLeads.length && !selectAllLeads;
                        }
                      }}
                      onChange={e => {
                        if (e.target.checked) {
                          if (selectedLeads.length === paginatedLeads.length) {
                            // Si todos los leads de la página están seleccionados, activar selección total
                            setSelectAllLeads(true);
                          } else {
                            // Seleccionar solo los leads de la página actual
                            setSelectedLeads(paginatedLeads);
                          }
                        } else {
                          setSelectAllLeads(false);
                          setSelectedLeads([]);
                        }
                      }}
                    />
                    {selectedLeads.length > 0 && !selectAllLeads && (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => setSelectAllLeads(true)}
                      >
                        Seleccionar todos los leads
                      </button>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Fecha de Viaje</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pax</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado A</th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-4">
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
                  <td colSpan={11} className="text-center py-4 text-xs text-gray-500">
                    No hay leads disponibles
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectAllLeads || selectedLeads.some(l => l.id === lead.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedLeads([...selectedLeads, lead]);
                          } else {
                            setSelectAllLeads(false);
                            setSelectedLeads(selectedLeads.filter(l => l.id !== lead.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{lead.full_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                      <div className="max-w-[150px] truncate" title={lead.email || ''}>
                        {lead.email || 'Sin email'}
                      </div>
                      {/* Mostrar indicador de archivado si está archivado y tiene motivo */}
                      {lead.status === 'archived' && lead.archived_reason && (
                        <div className="mt-1">
                          <span 
                            className="inline-flex items-center text-xs text-orange-600 cursor-help"
                            title={`Archivado: ${lead.archived_reason}`}
                          >
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Con motivo
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{formatDate(lead.created_at)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      <DropdownMenu open={isStatusMenuOpen === lead.id} onOpenChange={(open) => setIsStatusMenuOpen(open ? lead.id : null)}>
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
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedLeadForBudget(lead);
                            setIsBudgetModalOpen(true);
                          }}
                          className="p-1 rounded-full hover:bg-gray-100"
                          title="Crear presupuesto"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4 text-blue-600"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                      <div className="max-w-[120px] truncate" title={lead.origin}>
                        {lead.origin}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                      <div className="max-w-[80px] truncate" title={formatDate(lead.estimated_travel_date)}>
                        {formatDate(lead.estimated_travel_date)}
                      </div>
                    </td>
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
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H8z" clipRule="evenodd" />
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
            <span className="text-xs">Página</span>
            <select
              className="text-xs border rounded px-2 py-1"
              value={currentPage}
              onChange={e => setCurrentPage(Number(e.target.value))}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <option key={pageNum} value={pageNum}>{pageNum}</option>
              ))}
            </select>
            <span className="text-xs">de {totalPages}</span>
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
      <MakeIntegrationModal
        isOpen={isMakeModalOpen}
        onClose={() => setIsMakeModalOpen(false)}
      />

      <LeadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        lead={selectedLead}
        onSubmit={selectedLead ? handleUpdateLead : handleCreateLead}
        initialData={selectedLead}
      />

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
          isLead={true}
        />
      )}

      {/* Nuevo modal para CSV */}
      <CSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onUpload={handleCSVUpload}
      />

      {/* Nuevo Modal para archivar leads */}
      {leadToArchive && (
        <ArchiveLeadModal
          isOpen={isArchiveModalOpen}
          onClose={() => {
            setIsArchiveModalOpen(false);
            setLeadToArchive(null);
          }}
          onConfirm={handleArchiveLead}
          leadName={leadToArchive.name}
        />
      )}

      {/* Modal para crear presupuesto desde lead */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        selectedLead={selectedLeadForBudget}
        onClose={() => {
          setIsBudgetModalOpen(false);
          setSelectedLeadForBudget(null);
        }}
        onSubmit={handleCreateBudgetFromLead}
      />
    </div>
  );
} 