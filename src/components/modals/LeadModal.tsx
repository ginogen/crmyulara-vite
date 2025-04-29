import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { LeadForm } from '../forms/LeadForm';
import type { Lead } from '@/types/supabase';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Lead, 'id' | 'created_at' | 'inquiry_number'>) => Promise<void>;
  initialData?: Lead;
  lead?: Lead;
}

export function LeadModal({ isOpen, onClose, onSubmit, initialData, lead }: LeadModalProps) {
  // Usar lead si está presente, de lo contrario usar initialData
  const leadData = lead || initialData;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              {leadData?.id ? 'Editar Lead' : 'Nuevo Lead'}
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 max-h-[80vh] overflow-y-auto">
            <LeadForm
              initialData={leadData}
              onSubmit={onSubmit}
            />
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 