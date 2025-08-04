import { useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { Budget } from '@/types';
import type { Lead } from '@/types/supabase';
import { toast } from 'sonner';

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
  const [isSaving, setIsSaving] = useState(false);
  const { currentOrganization, currentBranch, user } = useAuth();
  const { contacts } = useContacts(currentOrganization?.id, currentBranch?.id);
  const { leads } = useLeads(currentOrganization?.id, currentBranch?.id);

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
      const baseData = {
        title,
        contact_id: selectedContact || null,
        lead_id: selectedLeadId || (selectedLead?.id || null),
      };

      if (mode === 'modal') {
        await onSubmit(baseData);
      } else {
        await onSubmit({
          ...baseData,
          description: content,
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
          <div className="h-full max-w-[1200px] mx-auto bg-white shadow-lg">
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