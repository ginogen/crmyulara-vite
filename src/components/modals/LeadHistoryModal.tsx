import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils/dates';

interface HistoryEntry {
  id: string;
  created_at: string;
  lead_id: string;
  action: string;
  description: string;
  user_id?: string;
  user?: {
    id: string;
    full_name: string;
  };
}

interface LeadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
}

// Mapeo de acciones a etiquetas legibles
const actionLabels: Record<string, string> = {
  lead_created: 'Lead Creado',
  lead_updated: 'Lead Actualizado',
  status_change: 'Cambio de Estado',
  assignment_change: 'Cambio de Asignación',
  converted_to_contact: 'Convertido a Contacto',
  task_created: 'Tarea Creada',
  task_status_changed: 'Estado de Tarea Cambiado',
  task_deleted: 'Tarea Eliminada',
  lead_deleted: 'Lead Eliminado',
  lead_archived: 'Lead Archivado',
};

// Colores para diferentes tipos de acciones
const actionColors: Record<string, string> = {
  lead_created: 'bg-green-100 text-green-800',
  lead_updated: 'bg-blue-100 text-blue-800',
  status_change: 'bg-yellow-100 text-yellow-800',
  assignment_change: 'bg-purple-100 text-purple-800',
  converted_to_contact: 'bg-emerald-100 text-emerald-800',
  task_created: 'bg-indigo-100 text-indigo-800',
  task_status_changed: 'bg-cyan-100 text-cyan-800',
  task_deleted: 'bg-red-100 text-red-800',
  lead_deleted: 'bg-gray-100 text-gray-800',
  lead_archived: 'bg-orange-100 text-orange-800',
};

export function LeadHistoryModal({ isOpen, onClose, leadId }: LeadHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && leadId) {
      fetchHistory();
    }
  }, [isOpen, leadId]);

  const fetchHistory = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('lead_history')
        .select(`
          *,
          user:users(id, full_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching lead history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              Historial del Lead
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No hay registros de historial para este lead.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acción
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {formatDateTime(entry.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            actionColors[entry.action] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {actionLabels[entry.action] || entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-medium">
                          {entry.user?.full_name || 'Sistema'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {entry.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 