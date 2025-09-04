import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useBudgetTemplates } from '@/hooks/useBudgetTemplates';
import { TemplateEditor } from '@/components/budgets/TemplateEditor';
import type { BudgetTemplate, CreateBudgetTemplateData } from '@/types/budget-template';
import { toast } from 'sonner';
import { EllipsisVerticalIcon, PlusIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function BudgetTemplatesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BudgetTemplate | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  const { currentOrganization, currentBranch, user } = useAuth();
  const { 
    templates, 
    isLoading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    duplicateTemplate,
    setAsDefault 
  } = useBudgetTemplates(currentOrganization?.id, currentBranch?.id);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEditTemplate = (template: BudgetTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: CreateBudgetTemplateData) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          ...data
        });
        toast.success('Plantilla actualizada exitosamente');
      } else {
        await createTemplate.mutateAsync({
          ...data,
          organization_id: currentOrganization!.id,
          branch_id: currentBranch!.id
        });
        toast.success('Plantilla creada exitosamente');
      }
      setIsModalOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(editingTemplate ? 'Error al actualizar plantilla' : 'Error al crear plantilla');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      return;
    }

    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success('Plantilla eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar plantilla');
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      await duplicateTemplate.mutateAsync(templateId);
      toast.success('Plantilla duplicada exitosamente');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Error al duplicar plantilla');
    }
  };

  const handleSetAsDefault = async (templateId: string) => {
    try {
      await setAsDefault.mutateAsync(templateId);
      toast.success('Plantilla establecida como predeterminada');
    } catch (error) {
      console.error('Error setting as default:', error);
      toast.error('Error al establecer como predeterminada');
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  if (isLoading) {
    return <div>Cargando plantillas...</div>;
  }

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Plantillas de Presupuesto</h1>
          <Button onClick={handleCreateTemplate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        </div>

        {/* Filtro de búsqueda */}
        <div className="mb-4">
          <div className="max-w-sm">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Buscar plantillas
            </label>
            <Input
              id="search"
              type="text"
              placeholder="Buscar por nombre o descripción..."
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
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
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
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {searchFilter ? 'No se encontraron plantillas que coincidan con la búsqueda' : 'No hay plantillas disponibles'}
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {template.is_default ? (
                          <StarIconSolid className="h-4 w-4 text-yellow-500 mr-2" />
                        ) : (
                          <StarIcon className="h-4 w-4 text-gray-300 mr-2" />
                        )}
                        <span className="font-medium">{template.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {template.description || 'Sin descripción'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        template.is_default 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.is_default ? 'Predeterminada' : 'Disponible'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(template.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                            Duplicar
                          </DropdownMenuItem>
                          {!template.is_default && (
                            <DropdownMenuItem onClick={() => handleSetAsDefault(template.id)}>
                              Establecer como predeterminada
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600"
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTemplate(null);
        }}
        title={editingTemplate ? "Editar Plantilla" : "Nueva Plantilla"}
        size="xl"
      >
        <TemplateEditor
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingTemplate(null);
          }}
          initialData={editingTemplate || undefined}
        />
      </Modal>
    </>
  );
}