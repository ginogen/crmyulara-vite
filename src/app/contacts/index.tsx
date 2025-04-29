import { useState } from 'react';
import { useContacts } from '../../hooks/useContacts';
import ContactList from '../../components/contacts/ContactList';
import { ContactModal } from '../../components/modals/ContactModal';
import { Contact } from '@/types/supabase';

export default function ContactsPage() {
  const { contacts, isLoading, error, createContact, updateContact, deleteContact } = useContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateContact = async (contactData: Omit<Contact, 'id' | 'created_at'>) => {
    try {
      await createContact.mutateAsync(contactData);
    } catch (err) {
      console.error('Error al crear contacto:', err);
    }
  };

  const handleUpdateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      await updateContact.mutateAsync({ id, ...updates });
      setSelectedContact(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al actualizar contacto:', err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await deleteContact.mutateAsync(id);
      } catch (err) {
        console.error('Error al eliminar contacto:', err);
      }
    }
  };

  if (isLoading) {
    return <div>Cargando contactos...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contactos</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nuevo Contacto
        </button>
      </div>

      <ContactList
        contacts={contacts}
        onSelect={(id: string) => {
          const contact = contacts.find(c => c.id === id);
          if (contact) {
            setSelectedContact(contact);
            setIsModalOpen(true);
          }
        }}
        onDelete={handleDeleteContact}
      />

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContact(null);
        }}
        contact={selectedContact || undefined}
        onSubmit={selectedContact ? 
          (data) => handleUpdateContact(selectedContact.id, data) : 
          handleCreateContact
        }
        tags={[]} // TODO: Implementar la obtención de tags
      />
    </div>
  );
} 