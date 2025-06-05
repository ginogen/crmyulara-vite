import { useState } from 'react';
import type { Database } from '../../lib/supabase/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadFormProps {
  initialData?: Partial<Lead>;
  onSubmit: (data: Omit<Lead, 'id' | 'created_at'>) => Promise<void>;
}

export function LeadForm({ initialData, onSubmit }: LeadFormProps) {
  const [formData, setFormData] = useState<Omit<Lead, 'id' | 'created_at'>>({
    inquiry_number: initialData?.inquiry_number || '',
    full_name: initialData?.full_name || '',
    email: initialData?.email || null,
    status: initialData?.status || 'new',
    assigned_to: initialData?.assigned_to || null,
    origin: initialData?.origin || '',
    province: initialData?.province || '',
    phone: initialData?.phone || '',
    pax_count: initialData?.pax_count || 1,
    estimated_travel_date: initialData?.estimated_travel_date || '',
    organization_id: initialData?.organization_id || '',
    branch_id: initialData?.branch_id || '',
    converted_to_contact: initialData?.converted_to_contact || null,
    archived_reason: initialData?.archived_reason || null,
    archived_at: initialData?.archived_at || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Número de consulta
        </label>
        <input
          type="text"
          value={formData.inquiry_number}
          onChange={(e) =>
            setFormData({ ...formData, inquiry_number: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nombre completo
        </label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email (opcional)
        </label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value || null })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Estado
        </label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as Lead['status'] })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="new">Nuevo</option>
          <option value="assigned">Asignado</option>
          <option value="contacted">Contactado</option>
          <option value="followed">Seguimiento</option>
          <option value="interested">Interesado</option>
          <option value="reserved">Reservado</option>
          <option value="liquidated">Liquidado</option>
          <option value="effective_reservation">Reserva efectiva</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Teléfono
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Cantidad de pasajeros
        </label>
        <input
          type="number"
          value={formData.pax_count}
          onChange={(e) =>
            setFormData({ ...formData, pax_count: parseInt(e.target.value) })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          min="1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Fecha estimada de viaje
        </label>
        <input
          type="date"
          value={formData.estimated_travel_date}
          onChange={(e) =>
            setFormData({ ...formData, estimated_travel_date: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Origen
        </label>
        <input
          type="text"
          value={formData.origin}
          onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Provincia
        </label>
        <input
          type="text"
          value={formData.province}
          onChange={(e) =>
            setFormData({ ...formData, province: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Guardar
        </button>
      </div>
    </form>
  );
} 