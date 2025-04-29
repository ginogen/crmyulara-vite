interface Lead {
  id: string;
  inquiry_number: string;
  full_name: string;
  status: 'new' | 'assigned' | 'contacted' | 'followed' | 'interested' | 'reserved' | 'liquidated' | 'effective_reservation';
  email: string;
  phone: string;
  source: string;
  created_at: string;
  assigned_to: string | null;
  notes: string | null;
  converted_to_contact: boolean | null;
  pax_count: number;
  estimated_travel_date: string;
}

interface LeadListProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export function LeadList({ leads, onEdit, onDelete }: LeadListProps) {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {leads.map((lead) => (
          <li key={lead.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-blue-600 truncate">
                    {lead.full_name}
                  </p>
                  <p className="ml-2 text-sm text-gray-500">
                    {lead.inquiry_number}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      lead.status === 'new'
                        ? 'bg-green-100 text-green-800'
                        : lead.status === 'assigned'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {lead.status}
                  </span>
                  <button
                    onClick={() => onEdit(lead)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(lead.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    {lead.phone}
                  </p>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.email || 'N/A'}
                  </td>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  <p>
                    {lead.pax_count} pax - {lead.estimated_travel_date}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 