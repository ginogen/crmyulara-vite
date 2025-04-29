import { Contact } from '@/types/contact';
import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ContactListProps {
  contacts: Contact[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

interface Filter {
  field: string;
  value: string;
}

export default function ContactList({ contacts, onSelect, onDelete }: ContactListProps) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filterOptions = [
    { label: 'Nombre', value: 'full_name' },
    { label: 'Email', value: 'email' },
    { label: 'Teléfono', value: 'phone' },
  ];

  const filteredContacts = contacts.filter(contact => {
    return filters.every(filter => {
      const fieldValue = contact[filter.field as keyof Contact]?.toString().toLowerCase() || '';
      return fieldValue.includes(filter.value.toLowerCase());
    });
  });

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const addFilter = (field: string, value: string) => {
    if (value.trim()) {
      setFilters([...filters, { field, value }]);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="text-xs px-2 py-1 border rounded-md"
          onChange={(e) => {
            const field = e.target.value;
            const value = prompt('Ingrese el valor a filtrar:');
            if (value) addFilter(field, value);
          }}
        >
          <option value="">Seleccionar filtro</option>
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Indicadores de filtros activos */}
        {filters.map((filter, index) => (
          <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-xs">
            <span>{filterOptions.find(opt => opt.value === filter.field)?.label}: {filter.value}</span>
            <button
              onClick={() => removeFilter(index)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedContacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-xs font-medium text-gray-900">{contact.full_name}</div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-xs text-gray-500">{contact.email}</div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-xs text-gray-500">{contact.phone}</div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs font-medium">
                  <button
                    onClick={() => onSelect(contact.id)}
                    className="text-indigo-600 hover:text-indigo-900 mr-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(contact.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t">
        <div className="flex items-center">
          <span className="text-xs text-gray-700">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredContacts.length)} de {filteredContacts.length} resultados
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-700">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 