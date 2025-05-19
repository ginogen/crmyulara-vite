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
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { Budget } from '@/types';
import { toast } from 'sonner';

interface BudgetFormProps {
  onSubmit: (data: Partial<Budget>) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<Budget>;
  mode?: 'modal' | 'editor';
}

export function BudgetForm({ onSubmit, onCancel, initialData, mode = 'modal' }: BudgetFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [selectedContact, setSelectedContact] = useState<string>(initialData?.contact_id || '');
  const [content, setContent] = useState(initialData?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const { currentOrganization, currentBranch, user } = useAuth();
  const { contacts } = useContacts(currentOrganization?.id, currentBranch?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (mode === 'modal') {
        await onSubmit({
          title,
          contact_id: selectedContact || null,
        });
      } else {
        await onSubmit({
          title,
          contact_id: selectedContact || null,
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
            {selectedContact && contacts.find(c => c.id === selectedContact) && (
              <span className="text-gray-500">
                - {contacts.find(c => c.id === selectedContact)?.full_name}
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

      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
          Contacto (Opcional)
        </label>
        <Select value={selectedContact} onValueChange={setSelectedContact}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar contacto" />
          </SelectTrigger>
          <SelectContent>
            {contacts.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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