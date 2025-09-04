import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation, useNavigate } from 'react-router-dom';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { Modal } from '@/components/ui/Modal';
import { useBudgets } from '@/hooks/useBudgets';
import { useContacts } from '@/hooks/useContacts';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';
import { useBudgetActions } from '@/hooks/useBudgetActions';
import type { Budget } from '@/types';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

export function BudgetsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [budgetData, setBudgetData] = useState<Partial<Budget> | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  
  const { currentOrganization, currentBranch, user } = useAuth();
  const { budgets, isLoading: budgetsLoading, createBudget, updateBudget } = useBudgets(
    currentOrganization?.id,
    currentBranch?.id
  );
  const { contacts, isLoading: contactsLoading } = useContacts(
    currentOrganization?.id,
    currentBranch?.id
  );
  const { leads, isLoading: leadsLoading } = useLeads(
    currentOrganization?.id,
    currentBranch?.id
  );
  const { processBudget, updateBudgetStatus, isLoading: isProcessing } = useBudgetActions();

  // Manejar navegación desde la página de leads
  useEffect(() => {
    const state = location.state as any;
    if (state?.editBudget && state?.openEditor) {
      // Establecer el presupuesto para edición y abrir el editor
      setEditingBudget(state.editBudget);
      setBudgetData(state.editBudget);
      setIsEditorOpen(true);
      
      // Limpiar el state para evitar que se reopen al navegar
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleInitialSubmit = async (data: Partial<Budget>) => {
    try {
      if (editingBudget) {
        // Si estamos editando, actualizar los metadatos y abrir el editor
        const updatedBudget = await updateBudget.mutateAsync({
          ...editingBudget,
          ...data,
        });
        
        // Configurar para abrir el editor con el presupuesto actualizado
        setBudgetData(updatedBudget);
        setIsModalOpen(false);
        setIsEditorOpen(true);
        
        toast.success('Abriendo editor de presupuesto...');
      } else {
        // Si es nuevo, continuar al editor
        setBudgetData(data);
        setIsModalOpen(false);
        setIsEditorOpen(true);
      }
    } catch (error) {
      console.error('Error al procesar el presupuesto:', error);
      toast.error('Error al procesar el presupuesto');
    }
  };

  const handleEditorSubmit = async (data: Partial<Budget>) => {
    try {
      if (editingBudget) {
        // Si estamos editando un presupuesto existente
        await updateBudget.mutateAsync({
          ...editingBudget,
          ...data,
        });
        toast.success('Presupuesto actualizado exitosamente');
      } else {
        // Si estamos creando un nuevo presupuesto
        const budget = await createBudget.mutateAsync({
          ...budgetData,
          ...data,
          amount: 0,
          assigned_to: user?.id || '',
        });
        await processBudget(budget);
      }
      setIsEditorOpen(false);
      setBudgetData(null);
      setEditingBudget(null);
    } catch (error) {
      console.error('Error al procesar el presupuesto:', error);
      toast.error(editingBudget ? 'Error al actualizar el presupuesto' : 'Error al crear el presupuesto');
    }
  };

  const handleStatusChange = async (budgetId: string, status: Budget['status']) => {
    try {
      await updateBudgetStatus.mutateAsync({
        budgetId,
        status,
        userId: user?.id || '',
      });
      toast.success('Estado actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetData(budget);
    setIsEditorOpen(true); // Abrir directamente el editor
  };

  const handleEditAssociation = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetData(budget);
    setIsModalOpen(true); // Abrir modal para editar asociación
  };

  const handleDuplicate = (budget: Budget) => {
    const duplicatedBudget = {
      ...budget,
      title: `${budget.title} (Copia)`,
      status: 'not_sent' as Budget['status'],
      public_url: null,
      pdf_url: null,
      sent_at: null,
      sent_by: null,
    };
    delete (duplicatedBudget as any).id;
    delete (duplicatedBudget as any).created_at;
    
    setBudgetData(duplicatedBudget);
    setEditingBudget(null); // No es edición, es duplicación
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsEditorOpen(false);
    setBudgetData(null);
    setEditingBudget(null);
  };

  const handleDownloadPDF = async (pdfUrl: string, budgetTitle: string) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8888';
      const url = pdfUrl.startsWith('http') ? pdfUrl : `${baseUrl}${pdfUrl}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error al descargar el PDF');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${budgetTitle.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error al descargar el PDF:', error);
      toast.error('Error al descargar el PDF');
    }
  };

  // Filtrar presupuestos por nombre del contacto o lead asociado
  const filteredBudgets = budgets.filter((budget) => {
    if (!searchFilter) return true;
    
    const contact = contacts.find(c => c.id === budget.contact_id);
    const lead = leads.find(l => l.id === budget.lead_id);
    
    const associatedName = contact?.full_name || lead?.full_name || '';
    
    return (
      budget.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      associatedName.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  if (budgetsLoading || contactsLoading || leadsLoading) {
    return <div>Cargando presupuestos...</div>;
  }

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/budgets/templates')}
            >
              Gestionar Plantillas
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              Nuevo Presupuesto
            </Button>
          </div>
        </div>

        {/* Filtro de búsqueda */}
        <div className="mb-4">
          <div className="max-w-sm">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Buscar presupuestos
            </label>
            <Input
              id="search"
              type="text"
              placeholder="Buscar por título o nombre asociado..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asociado con
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBudgets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchFilter ? 'No se encontraron presupuestos que coincidan con la búsqueda' : 'No hay presupuestos disponibles'}
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((budget) => {
                const contact = contacts.find(c => c.id === budget.contact_id);
                const lead = leads.find(l => l.id === budget.lead_id);
                const associatedWith = contact ? 
                  { name: contact.full_name, type: 'Contacto', email: contact.email, phone: contact.phone } :
                  lead ? 
                  { name: lead.full_name, type: 'Lead', email: lead.email, phone: lead.phone, inquiry: lead.inquiry_number } :
                  null;

                return (
                  <tr key={budget.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {budget.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {associatedWith ? (
                        <div>
                          <div className="font-medium">{associatedWith.name}</div>
                          <div className="text-xs text-gray-500">
                            {associatedWith.type}
                            {associatedWith.inquiry && ` • ${associatedWith.inquiry}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sin asociar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        budget.status === 'approved' ? 'bg-green-100 text-green-800' :
                        budget.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        budget.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {budget.status === 'not_sent' ? 'Sin enviar' :
                         budget.status === 'sent' ? 'Enviado' :
                         budget.status === 'approved' ? 'Aprobado' :
                         'Rechazado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(budget.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {budget.public_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(budget.public_url, '_blank')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          VER
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin enlace</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(budget)}
                          >
                            Editar Contenido
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditAssociation(budget)}
                          >
                            Editar Asociación
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(budget)}
                          >
                            Duplicar
                          </DropdownMenuItem>
                          {budget.public_url && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (budget.public_url) {
                                  // Construir la URL completa usando la URL base del servidor
                                  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8888';
                                  const url = budget.public_url.startsWith('http') 
                                    ? budget.public_url 
                                    : `${baseUrl}/budgets/public/${budget.id}`;
                                  window.open(url, '_blank');
                                } else {
                                  toast.error('El enlace público no está disponible');
                                }
                              }}
                            >
                              Ver enlace público
                            </DropdownMenuItem>
                          )}
                          {budget.pdf_url && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (budget.pdf_url) {
                                  handleDownloadPDF(budget.pdf_url, budget.title);
                                } else {
                                  toast.error('El PDF no está disponible');
                                }
                              }}
                            >
                              Descargar PDF
                            </DropdownMenuItem>
                          )}
                          {budget.status === 'not_sent' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(budget.id, 'sent')}
                            >
                              Marcar como enviado
                            </DropdownMenuItem>
                          )}
                          {budget.status === 'sent' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(budget.id, 'approved')}
                              >
                                Aprobar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(budget.id, 'rejected')}
                              >
                                Rechazar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingBudget ? "Editar Presupuesto" : "Nuevo Presupuesto"}
        size="lg"
      >
        <BudgetForm 
          onSubmit={handleInitialSubmit}
          onCancel={handleCancel}
          mode="modal"
          initialData={budgetData || undefined}
        />
      </Modal>

      {isEditorOpen && budgetData && (
        <BudgetForm 
          onSubmit={handleEditorSubmit}
          onCancel={handleCancel}
          mode="editor"
          initialData={budgetData}
        />
      )}
    </>
  );
} 