import { useState } from 'react';
import { useContacts } from '../../hooks/useContacts';
import ContactForm from '../../components/forms/ContactForm';
import ContactList from '../../components/contacts/ContactList';
import ContactModal from '../../components/modals/ContactModal';

export default function ContactsPage() {
  const { contacts, loading, error, createContact, updateContact, deleteContact } = useContacts();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateContact = async (contactData: any) => {
    try {
      await createContact(contactData);
    } catch (err) {
      console.error('Error al crear contacto:', err);
    }
  };

  const handleUpdateContact = async (id: string, updates: any) => {
    try {
      await updateContact(id, updates);
      setSelectedContact(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al actualizar contacto:', err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await deleteContact(id);
      } catch (err) {
        console.error('Error al eliminar contacto:', err);
      }
    }
  };

  if (loading) {
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
        onEdit={(contact) => {
          setSelectedContact(contact);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteContact}
      />

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
        onSubmit={selectedContact ? handleUpdateContact : handleCreateContact}
      />
    </div>
  );
} 