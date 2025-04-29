import { useLeads } from '../../hooks/useLeads';
import { useContacts } from '@/hooks/useContacts';
import { useBudgets } from '../../hooks/useBudgets';
import ContactList from '@/components/contacts/ContactList';
import { ContactForm } from '@/components/forms/ContactForm';
import { useState } from 'react';

export default function Dashboard() {
  const { leads, loading: leadsLoading } = useLeads();
  const { contacts, isLoading, error, createContact, updateContact, deleteContact } = useContacts();
  const { budgets, isLoading: budgetsLoading } = useBudgets();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  if (leadsLoading || isLoading || budgetsLoading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const newLeads = leads.filter((lead) => lead.status === 'new').length;
  const assignedLeads = leads.filter((lead) => lead.status === 'assigned').length;
  const totalContacts = contacts.length;
  const totalBudgets = budgets.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <span className="text-white text-2xl">👥</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Nuevos Leads
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {newLeads}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <span className="text-white text-2xl">📋</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Leads Asignados
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {assignedLeads}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <span className="text-white text-2xl">📞</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Contactos
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {totalContacts}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <span className="text-white text-2xl">💰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Presupuestos
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {totalBudgets}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Contactos Recientes</h2>
          <ContactList
            contacts={contacts}
            onSelect={setSelectedContact}
            onDelete={(id) => new Promise<void>((resolve, reject) => {
              deleteContact.mutate(id, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
              });
            })}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">
            {selectedContact ? 'Editar Contacto' : 'Nuevo Contacto'}
          </h2>
          <ContactForm
            contact={selectedContact ? contacts.find(c => c.id === selectedContact) : undefined}
            onSubmit={async (data) => {
              if (selectedContact) {
                await new Promise<void>((resolve, reject) => {
                  updateContact.mutate({ id: selectedContact, ...data }, {
                    onSuccess: () => resolve(),
                    onError: (error) => reject(error)
                  });
                });
              } else {
                await new Promise<void>((resolve, reject) => {
                  createContact.mutate(data, {
                    onSuccess: () => resolve(),
                    onError: (error) => reject(error)
                  });
                });
              }
              setSelectedContact(null);
            }}
            onCancel={() => setSelectedContact(null)}
            tags={[]} // TODO: Implementar la obtención de tags
          />
        </div>
      </div>
    </div>
  );
} 