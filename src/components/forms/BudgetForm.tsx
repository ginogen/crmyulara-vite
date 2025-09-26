import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReactSelect from 'react-select';
import { useContacts } from '@/hooks/useContacts';
import { useLeads } from '@/hooks/useLeads';
import { useBudgetTemplates } from '@/hooks/useBudgetTemplates';
import { useAuth } from '@/contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { Budget } from '@/types';
import type { Lead } from '@/types/supabase';
import type { BudgetTemplate } from '@/types/budget-template';
import { toast } from 'sonner';
import { MarginControls, type MarginConfig, DEFAULT_MARGIN_CONFIG, marginConfigToStyles } from '@/components/budgets/MarginControls';

interface BudgetFormProps {
  onSubmit: (data: Partial<Budget>) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<Budget>;
  mode?: 'modal' | 'editor';
  selectedLead?: Lead | null;
}

export function BudgetForm({ onSubmit, onCancel, initialData, mode = 'modal', selectedLead }: BudgetFormProps) {
  const [title, setTitle] = useState(
    initialData?.title || 
    (selectedLead ? `Presupuesto para ${selectedLead.full_name}` : '')
  );
  const [selectedContact, setSelectedContact] = useState<string>(initialData?.contact_id || '');
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialData?.lead_id || (selectedLead?.id && !initialData ? selectedLead.id : ''));
  const [selectedType, setSelectedType] = useState<'contact' | 'lead'>(
    selectedLead ? 'lead' : 
    initialData?.contact_id ? 'contact' : 
    initialData?.lead_id ? 'lead' : 'contact'
  );
  const [content, setContent] = useState(initialData?.description || '');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialData?.template_id || '');
  const [marginConfig, setMarginConfig] = useState<MarginConfig>(() => {
    // Tratar de extraer configuración de márgenes del contenido existente o usar default
    try {
      if (initialData?.description) {
        const marginMatch = initialData.description.match(/<!--MARGIN_CONFIG:(.+?)-->/);
        if (marginMatch) {
          return JSON.parse(marginMatch[1]);
        }
      }
    } catch (error) {
      console.warn('Error parsing margin config:', error);
    }
    return DEFAULT_MARGIN_CONFIG;
  });
  const [isSaving, setIsSaving] = useState(false);
  const { currentOrganization, currentBranch, user } = useAuth();
  const { contacts } = useContacts(currentOrganization?.id, currentBranch?.id);
  const { leads } = useLeads(currentOrganization?.id, currentBranch?.id);
  const { templates } = useBudgetTemplates(currentOrganization?.id, currentBranch?.id);

  // Aplicar plantilla cuando se selecciona
  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== 'none' && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template && template.default_content && !initialData) {
        setContent(template.default_content);
      }
    }
  }, [selectedTemplate, templates, initialData]);

  // Seleccionar plantilla por defecto automáticamente para nuevos presupuestos
  useEffect(() => {
    if (!initialData && templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      }
    }
  }, [templates, initialData, selectedTemplate]);

  // Preparar opciones para react-select
  const contactOptions = contacts.map(contact => ({
    value: contact.id,
    label: contact.full_name,
    subtitle: `${contact.email || 'Sin email'} • ${contact.phone}`,
    type: 'contact' as const
  }));

  const leadOptions = leads.map(lead => ({
    value: lead.id,
    label: lead.full_name,
    subtitle: `${lead.inquiry_number} • ${lead.origin} • ${lead.pax_count} pax`,
    type: 'lead' as const
  }));

  const allOptions = [
    ...contactOptions.map(opt => ({ ...opt, group: 'Contactos' })),
    ...leadOptions.map(opt => ({ ...opt, group: 'Leads' }))
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Asegurar que solo uno de contact_id o lead_id esté presente
      const finalLeadId = selectedLeadId || selectedLead?.id;
      
      // Validar que al menos uno esté seleccionado
      if (!selectedContact && !finalLeadId) {
        toast.error('Debe asociar el presupuesto con un contacto o lead');
        setIsSaving(false);
        return;
      }
      
      const baseData = {
        title,
        contact_id: selectedContact && !finalLeadId ? selectedContact : null,
        lead_id: finalLeadId && !selectedContact ? finalLeadId : null,
        template_id: selectedTemplate && selectedTemplate !== 'none' ? selectedTemplate : null,
      };

      if (mode === 'modal') {
        await onSubmit(baseData);
      } else {
        // Incluir configuración de márgenes en el contenido
        const contentWithMargins = `<!--MARGIN_CONFIG:${JSON.stringify(marginConfig)}-->\n${content}`;
        
        await onSubmit({
          ...baseData,
          description: contentWithMargins,
          status: 'not_sent',
          organization_id: currentOrganization?.id || '',
          branch_id: currentBranch?.id || '',
          assigned_to: user?.id || '',
        });
        toast.success('Presupuesto guardado exitosamente');
      }
    } catch (error) {
      console.error('Error al guardar presupuesto:', error);
      toast.error('Error al guardar el presupuesto');
    } finally {
      setIsSaving(false);
    }
  };

  if (mode === 'editor') {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col h-screen overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            {selectedLead && (
              <span className="text-gray-500">
                - {selectedLead.full_name} (Lead)
              </span>
            )}
            {!selectedLead && selectedContact && contacts.find(c => c.id === selectedContact) && (
              <span className="text-gray-500">
                - {contacts.find(c => c.id === selectedContact)?.full_name} (Contacto)
              </span>
            )}
          </div>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="px-4"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              className="px-4"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Presupuesto'}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-gray-50 p-4">
          <div className="h-full flex gap-4">
            {/* Panel de controles lateral */}
            <div className="w-80 flex flex-col space-y-4">
              <MarginControls 
                config={marginConfig}
                onChange={setMarginConfig}
              />
            </div>
            
            {/* Editor principal */}
            <div className="flex-1 bg-white shadow-lg">
              <div 
                className="h-full"
                style={marginConfigToStyles(marginConfig)}
              >
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  style={{ height: 'calc(100vh - 180px)' }}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del Presupuesto
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ingrese el nombre del presupuesto"
          required
        />
      </div>

      {/* Selector de Plantilla */}
      {mode === 'modal' && (
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
            Plantilla
          </label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar plantilla (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin plantilla</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} {template.is_default && '(Predeterminada)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && selectedTemplate !== 'none' && templates.find(t => t.id === selectedTemplate)?.description && (
            <p className="text-xs text-gray-500 mt-1">
              {templates.find(t => t.id === selectedTemplate)?.description}
            </p>
          )}
        </div>
      )}

      {selectedLead && mode === 'modal' && !initialData ? (
        // Solo mostrar información fija del lead cuando se crea desde un lead específico (no en edición)
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lead Asociado
          </label>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-sm font-medium text-blue-900">{selectedLead.full_name}</div>
            <div className="text-xs text-blue-700 mt-1">
              <span>Email: {selectedLead.email || 'No especificado'}</span>
              <span className="ml-3">Teléfono: {selectedLead.phone}</span>
            </div>
            <div className="text-xs text-blue-700 mt-1">
              <span>Inquiry: {selectedLead.inquiry_number}</span>
              <span className="ml-3">Origen: {selectedLead.origin}</span>
              <span className="ml-3">Pax: {selectedLead.pax_count}</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asociar con Contacto o Lead (Opcional)
          </label>
          <ReactSelect
            options={allOptions}
            value={allOptions.find(opt => 
              opt.value === selectedContact || opt.value === selectedLeadId
            ) || null}
            onChange={(option) => {
              if (option) {
                if (option.type === 'contact') {
                  setSelectedContact(option.value);
                  setSelectedLeadId('');
                } else {
                  setSelectedLeadId(option.value);
                  setSelectedContact('');
                }
              } else {
                setSelectedContact('');
                setSelectedLeadId('');
              }
            }}
            formatOptionLabel={(option) => (
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.subtitle}</div>
              </div>
            )}
            formatGroupLabel={(data) => (
              <div className="font-semibold text-gray-700 text-sm py-1">
                {data.label}
              </div>
            )}
            options={[
              {
                label: 'Contactos',
                options: contactOptions
              },
              {
                label: 'Leads', 
                options: leadOptions
              }
            ]}
            placeholder="Buscar contacto o lead..."
            isClearable
            isSearchable
            className="text-sm"
            classNamePrefix="react-select"
            noOptionsMessage={() => "No se encontraron resultados"}
          />
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button 
          type="submit"
          disabled={isSaving}
        >
          Continuar
        </Button>
      </div>
    </form>
  );
} 