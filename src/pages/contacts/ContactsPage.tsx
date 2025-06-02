'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { formatPhoneNumber } from '@/lib/utils/strings';
import { formatDate } from '@/lib/utils/dates';
import { useContacts } from '@/hooks/useContacts';
import { WhatsAppModal, ContactManagementModal, TagsModal, ContactModal } from '@/components/modals';
import Select from 'react-select';
import { SingleValue } from 'react-select';

// Definir los tipos que necesitamos
type UserRole = 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';

interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  tag: string;
  created_at: string;
  organization_id: string;
  branch_id: string;
  assigned_to: string;
  original_lead_id?: string;
}

// Exportar el componente como default y con nombre
export function ContactsPage() {
  // Datos de autenticación
  const auth = useAuth();
  const user = auth.user || { email: '', id: '' };
  const userRole = 'super_admin' as UserRole; // Valor temporal para evitar errores
  const currentOrganization = auth.currentOrganization;
  const currentBranch = auth.currentBranch;
  
  // Datos de contactos
  const { contacts, isLoading, error, createContact, updateContact } = useContacts(
    currentOrganization?.id,
    currentBranch?.id
  );
  
  // Estados locales
  const [filters, setFilters] = useState({
    name: '',
    city: '',
    tag: '',
    assignedTo: '',
    phone: '',
    email: '',
  });
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>();
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string }>>([]);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedContactForWA, setSelectedContactForWA] = useState<Contact | null>(null);
  const [contactFormData, setContactFormData] = useState<Partial<Contact>>({});
  const supabase = createClient();
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [selectedContactForManagement, setSelectedContactForManagement] = useState<Contact | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeFilters, setActiveFilters] = useState<Array<{ field: string; value: string }>>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<{ id: string; name: string; color: string } | null>(null);
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [contactsWithTasks, setContactsWithTasks] = useState<Set<string>>(new Set());

  const filterOptions = {
    tag: [
      { value: '', label: 'Todas las etiquetas' },
      ...tags.map(tag => ({ value: tag.name, label: tag.name }))
    ],
  };

  const getFilterLabel = (field: string, value: string) => {
    switch (field) {
      case 'tag':
        return filterOptions.tag.find(opt => opt.value === value)?.label || value;
      case 'assignedTo':
        return agents.find(agent => agent.id === value)?.full_name || value;
      default:
        return value;
    }
  };

  // Cargar agentes
  useEffect(() => {
    const fetchAgents = async () => {
      if (!currentOrganization?.id || !currentBranch?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('organization_id', currentOrganization.id)
          .eq('branch_id', currentBranch.id);

        if (error) throw error;
        setAgents(data || []);
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, [currentOrganization?.id, currentBranch?.id]);

  // Cargar etiquetas
  useEffect(() => {
    const fetchTags = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTags(data || []);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, [currentOrganization?.id]);

  // Actualizar formulario cuando cambia el contacto seleccionado
  useEffect(() => {
    if (selectedContact) {
      setContactFormData(selectedContact);
    } else {
      setContactFormData({});
    }
  }, [selectedContact]);

  useEffect(() => {
    const fetchContactsWithTasks = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('related_to_id')
          .eq('related_to_type', 'contact')
          .eq('organization_id', currentOrganization.id);
        
        if (error) throw error;
        
        const contactIdsWithTasks = new Set(data.map(task => task.related_to_id));
        setContactsWithTasks(contactIdsWithTasks);
      } catch (error) {
        console.error('Error al obtener contactos con tareas:', error);
      }
    };

    fetchContactsWithTasks();
  }, [currentOrganization?.id]);

  // Handlers para crear/editar contactos
  const handleCreateContact = async () => {
    try {
      if (!contactFormData.full_name || !contactFormData.phone || !contactFormData.city) {
        alert('Por favor complete los campos obligatorios');
        return;
      }
      
      if (!currentOrganization?.id || !currentBranch?.id) {
        alert('No se puede crear el contacto porque faltan datos de organización o sucursal');
        return;
      }
      
      const newContact: Omit<Contact, 'id' | 'created_at'> = {
        full_name: contactFormData.full_name || '',
        email: contactFormData.email || '',
        phone: contactFormData.phone || '',
        city: contactFormData.city || '',
        province: contactFormData.province || '',
        tag: contactFormData.tag || 'cliente',
        organization_id: currentOrganization.id,
        branch_id: currentBranch.id,
        assigned_to: contactFormData.assigned_to || user.id || '',
      };
      
      await createContact.mutateAsync(newContact);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  const handleUpdateContact = async () => {
    if (!selectedContact) return;

    try {
      if (!contactFormData.full_name || !contactFormData.phone || !contactFormData.city) {
        alert('Por favor complete los campos obligatorios');
        return;
      }
      
      await updateContact.mutateAsync({
        id: selectedContact.id,
        ...contactFormData
      });
      setIsModalOpen(false);
      setSelectedContact(undefined);
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  const handleOpenModal = (contact?: Contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContact(undefined);
    setContactFormData({});
  };

  const handleOpenManagementModal = (contact: Contact) => {
    setSelectedContactForManagement(contact);
    setIsManagementModalOpen(true);
    // Cerrar el menú de acciones
    const menu = document.getElementById(`menu-${contact.id}`);
    if (menu) {
      menu.classList.add('hidden');
    }
  };

  const handleCloseManagementModal = () => {
    setIsManagementModalOpen(false);
    setSelectedContactForManagement(null);
  };

  const handleTagSelect = (tag: { id: string; name: string; color: string }) => {
    setSelectedTag(tag);
    handleFilterChange('tag', tag.name);
  };

  const filteredContacts = contacts.filter((contact) => {
    return (
      contact.full_name.toLowerCase().includes(filters.name.toLowerCase()) &&
      contact.city.toLowerCase().includes(filters.city.toLowerCase()) &&
      contact.tag.toLowerCase().includes(filters.tag.toLowerCase()) &&
      (filters.assignedTo === 'all' || !filters.assignedTo ? true : contact.assigned_to === filters.assignedTo)
    );
  });

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    if (value) {
      setActiveFilters(prev => [...prev, { field, value }]);
    } else {
      setActiveFilters(prev => prev.filter(f => f.field !== field));
    }
  };

  const removeFilter = (field: string) => {
    setFilters(prev => ({ ...prev, [field]: '' }));
    setActiveFilters(prev => prev.filter(f => f.field !== field));
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-10">
          <p className="text-red-500">Error al cargar los contactos: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-full p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTagsModalOpen(true)}
              className="inline-flex items-center gap-x-2 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 rounded-md"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.94l1-4H9.03z" />
              </svg>
              Etiquetas
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-x-2 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 rounded-md"
            >
              <svg className="-ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Nuevo Contacto
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-medium">Filtros</h2>
            <button
              className="text-xs text-blue-600 hover:underline focus:outline-none"
              onClick={() => setIsFiltersOpen(open => !open)}
            >
              {isFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>
          </div>
          {isFiltersOpen && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div></div>
                {activeFilters.length > 0 && (
                  <button
                    onClick={() => {
                      setFilters({ name: '', city: '', tag: '', assignedTo: '', phone: '', email: '' });
                      setActiveFilters([]);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Limpiar todos
                  </button>
                )}
              </div>

              {/* Resumen de filtros y resultados */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-700">Estás viendo:</span>
                    {activeFilters.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {activeFilters.map((filter, index) => (
                          <span key={index} className="text-xs text-gray-600">
                            {filter.field === 'name' ? 'Nombre' :
                             filter.field === 'city' ? 'Ciudad' :
                             filter.field === 'tag' ? 'Etiqueta' :
                             filter.field === 'assignedTo' ? 'Asignado a' :
                             filter.field === 'phone' ? 'Teléfono' :
                             filter.field === 'email' ? 'Email' : filter.field}: {getFilterLabel(filter.field, filter.value)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Todos los contactos</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {filteredContacts.length} {filteredContacts.length === 1 ? 'contacto' : 'contactos'} encontrados
                  </span>
                </div>
              </div>

              {/* Indicadores de filtros activos */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {activeFilters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-xs">
                      <span className="text-blue-700">
                        {filter.field === 'name' ? 'Nombre' :
                         filter.field === 'city' ? 'Ciudad' :
                         filter.field === 'tag' ? 'Etiqueta' :
                         filter.field === 'assignedTo' ? 'Asignado a' :
                         filter.field === 'phone' ? 'Teléfono' :
                         filter.field === 'email' ? 'Email' : filter.field}: {getFilterLabel(filter.field, filter.value)}
                      </span>
                      <button
                        onClick={() => removeFilter(filter.field)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    type="text"
                    className="w-full p-1.5 text-xs border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Buscar por nombre..."
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    className="w-full p-1.5 text-xs border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Filtrar por ciudad..."
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    className="w-full p-1.5 text-xs border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Filtrar por teléfono..."
                    value={filters.phone}
                    onChange={(e) => handleFilterChange('phone', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="text"
                    className="w-full p-1.5 text-xs border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Filtrar por email..."
                    value={filters.email}
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Etiqueta
                  </label>
                  <Select
                    options={[
                      { value: '', label: 'Todas las etiquetas' },
                      ...tags.map(tag => ({ value: tag.name, label: tag.name }))
                    ]}
                    value={selectedTag ? { value: selectedTag.name, label: selectedTag.name } : { value: '', label: 'Todas las etiquetas' }}
                    onChange={(option: { value: string; label: string } | null) => {
                      if (option) {
                        const tag = tags.find(t => t.name === option.value);
                        if (tag) {
                          handleTagSelect(tag);
                        } else {
                          setSelectedTag(null);
                          handleFilterChange('tag', '');
                        }
                      } else {
                        setSelectedTag(null);
                        handleFilterChange('tag', '');
                      }
                    }}
                    className="text-xs"
                    classNamePrefix="select"
                    placeholder="Seleccionar etiqueta..."
                    isClearable
                    isSearchable
                  />
                </div>

                {userRole !== 'sales_agent' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Asignado a
                    </label>
                    <Select
                      options={[
                        { value: 'all', label: 'Todos los agentes' },
                        ...agents.map(agent => ({ value: agent.id, label: agent.full_name }))
                      ]}
                      value={agents.find(agent => agent.id === filters.assignedTo) ? 
                        { value: filters.assignedTo, label: agents.find(agent => agent.id === filters.assignedTo)?.full_name } :
                        { value: 'all', label: 'Todos los agentes' }
                      }
                      onChange={(newValue: SingleValue<{ value: string; label: string | undefined }>) => handleFilterChange('assignedTo', newValue?.value || '')}
                      className="text-xs"
                      classNamePrefix="select"
                      placeholder="Seleccionar agente..."
                      isClearable
                      isSearchable
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Selector de cantidad por página y paginación */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
          <div></div>
          <div className="flex items-center space-x-2">
            <label className="text-xs mr-2">Contactos por página:</label>
            <select
              className="text-xs border rounded px-2 py-1"
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[10, 20, 30, 50, 100].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla de Contactos */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="pl-4 pr-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedContacts.length === filteredContacts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContacts(filteredContacts);
                        } else {
                          setSelectedContacts([]);
                        }
                      }}
                    />
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Nombre</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Ciudad</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Teléfono</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Email</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">Etiqueta</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">Fecha</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      <div className="flex justify-center items-center space-x-2">
                        <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs">Cargando...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-xs text-gray-500">
                      No hay contactos disponibles
                    </td>
                  </tr>
                ) : (
                  paginatedContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="pl-4 pr-3 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedContacts.some(c => c.id === contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts([...selectedContacts, contact]);
                            } else {
                              setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                        <div className="flex items-center space-x-2">
                          {contactsWithTasks.has(contact.id) && (
                            <div className="w-2 h-2 rounded-full bg-blue-500" title="Tiene tareas pendientes" />
                          )}
                          <span>{contact.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 truncate text-xs">{contact.city}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 text-xs">
                        <div className="flex items-center gap-2">
                          {formatPhoneNumber(contact.phone)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContactForWA(contact);
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 448 512"
                              fill="currentColor"
                              className="w-4 h-4 text-green-600"
                            >
                              <path
                                d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 truncate text-xs">{contact.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Select
                          options={tags.map(tag => ({ 
                            value: tag.name, 
                            label: tag.name,
                            color: tag.color 
                          }))}
                          value={{ 
                            value: contact.tag, 
                            label: contact.tag,
                            color: tags.find(t => t.name === contact.tag)?.color || 'bg-gray-100 text-gray-800'
                          }}
                          onChange={async (option: { value: string; label: string; color?: string } | null) => {
                            if (option && option.value !== contact.tag) {
                              try {
                                await updateContact.mutateAsync({
                                  id: contact.id,
                                  tag: option.value
                                });
                              } catch (error) {
                                console.error('Error updating contact tag:', error);
                              }
                            }
                          }}
                          className="text-xs min-w-[120px]"
                          classNamePrefix="select"
                          placeholder="Seleccionar etiqueta..."
                          isSearchable={false}
                          formatOptionLabel={(option: { value: string; label: string; color?: string }) => (
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${option.color || 'bg-gray-100 text-gray-800'}`}>
                              {option.label}
                            </span>
                          )}
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '24px',
                              height: '24px',
                              fontSize: '12px',
                              border: 'none',
                              boxShadow: 'none',
                              backgroundColor: 'transparent',
                            }),
                            valueContainer: (base) => ({
                              ...base,
                              height: '24px',
                              padding: '0',
                            }),
                            input: (base) => ({
                              ...base,
                              margin: '0',
                              padding: '0',
                            }),
                            indicatorSeparator: () => ({
                              display: 'none',
                            }),
                            indicatorsContainer: (base) => ({
                              ...base,
                              height: '24px',
                            }),
                            dropdownIndicator: (base) => ({
                              ...base,
                              padding: '0 4px',
                            }),
                            menu: (base) => ({
                              ...base,
                              fontSize: '12px',
                            }),
                            option: (base) => ({
                              ...base,
                              padding: '4px 8px',
                            }),
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 text-xs">{formatDate(contact.created_at)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="relative">
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            onClick={() => {
                              const menu = document.getElementById(`menu-${contact.id}`);
                              if (menu) {
                                menu.classList.toggle('hidden');
                              }
                            }}
                          >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          <div id={`menu-${contact.id}`} className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                onClick={() => handleOpenModal(contact)}
                              >
                                <svg className="mr-2 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editar
                              </button>
                              <button
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setIsTasksModalOpen(true);
                                }}
                              >
                                <svg className="mr-2 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                Tareas
                              </button>
                              <button
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                onClick={() => {
                                  setSelectedContact(contact);
                                  handleOpenManagementModal(contact);
                                }}
                              >
                                <svg className="mr-2 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                                Gestión
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación abajo de la tabla */}
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
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="text-xs">Página</span>
              <select
                className="text-xs border rounded px-2 py-1"
                value={currentPage}
                onChange={e => setCurrentPage(Number(e.target.value))}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <option key={pageNum} value={pageNum}>{pageNum}</option>
                ))}
              </select>
              <span className="text-xs">de {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear/editar contacto */}
      {isModalOpen && (
        <ContactModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          contact={selectedContact}
          onSubmit={selectedContact ? handleUpdateContact : handleCreateContact}
          tags={tags}
        />
      )}

      {/* Modal de tareas */}
      {selectedContact && isTasksModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Tareas para {selectedContact.full_name}</h2>
            <p className="text-gray-500 mb-6">Aquí se mostrarían las tareas asociadas al contacto</p>
            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2.5 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
                onClick={() => {
                  setIsTasksModalOpen(false);
                  setSelectedContact(undefined);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {selectedContactForWA && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setSelectedContactForWA(null);
          }}
          contact={selectedContactForWA}
        />
      )}

      {/* Modal de gestión */}
      <ContactManagementModal
        isOpen={isManagementModalOpen}
        onClose={handleCloseManagementModal}
        contact={selectedContactForManagement || undefined}
      />

      {/* Modal de etiquetas */}
      <TagsModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        onTagSelect={handleTagSelect}
      />
    </div>
  );
}

// Exportar por defecto para permitir la importación sin nombres
export default ContactsPage; 