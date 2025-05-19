import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { Modal } from '@/components/ui/Modal';
import { useBudgets } from '@/hooks/useBudgets';
import { useContacts } from '@/hooks/useContacts';
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
  
  const { currentOrganization, currentBranch, user } = useAuth();
  const { budgets, isLoading: budgetsLoading, createBudget, updateBudget } = useBudgets(
    currentOrganization?.id,
    currentBranch?.id
  );
  const { contacts, isLoading: contactsLoading } = useContacts(
    currentOrganization?.id,
    currentBranch?.id
  );
  const { processBudget, updateBudgetStatus, isLoading: isProcessing } = useBudgetActions();

  const handleInitialSubmit = async (data: Partial<Budget>) => {
    setBudgetData(data);
    setIsModalOpen(false);
    setIsEditorOpen(true);
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
    setIsEditorOpen(true);
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

  if (budgetsLoading || contactsLoading) {
    return <div>Cargando presupuestos...</div>;
  }

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <Button onClick={() => setIsModalOpen(true)}>
            Nuevo Presupuesto
          </Button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgets.map((budget) => {
                const contact = contacts.find(c => c.id === budget.contact_id);
                return (
                  <tr key={budget.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {budget.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact ? contact.full_name : '-'}
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
                            Editar
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title="Nuevo Presupuesto"
      >
        <BudgetForm 
          onSubmit={handleInitialSubmit}
          onCancel={handleCancel}
          mode="modal"
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