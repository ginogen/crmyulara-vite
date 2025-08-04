import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useContactHistory() {
  const { user } = useAuth();
  const supabase = createClient();

  // Función para registrar una entrada en el historial del contacto
  const addContactHistoryEntry = async (
    contactId: string,
    action: string,
    description: string
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('contact_history')
        .insert({
          contact_id: contactId,
          user_id: user.id,
          action,
          description,
        });

      if (error) {
        console.error('Error adding contact history entry:', error);
      }
    } catch (error) {
      console.error('Error adding contact history entry:', error);
    }
  };

  // Funciones específicas para diferentes tipos de eventos
  const logContactCreated = async (contactId: string, contactName: string) => {
    await addContactHistoryEntry(
      contactId,
      'contact_created',
      `Contacto creado: ${contactName}`
    );
  };

  const logContactUpdated = async (contactId: string, contactName: string, changes?: string) => {
    const description = changes 
      ? `Contacto actualizado: ${contactName} - Cambios: ${changes}`
      : `Contacto actualizado: ${contactName}`;
    
    await addContactHistoryEntry(contactId, 'contact_updated', description);
  };

  const logTaskCreated = async (contactId: string, taskTitle: string) => {
    await addContactHistoryEntry(
      contactId,
      'task_created',
      `Tarea creada: "${taskTitle}"`
    );
  };

  const logTaskCompleted = async (contactId: string, taskTitle: string) => {
    await addContactHistoryEntry(
      contactId,
      'task_completed',
      `Tarea completada: "${taskTitle}"`
    );
  };

  const logWhatsAppSent = async (contactId: string, contactName: string, message: string) => {
    const truncatedMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;
    await addContactHistoryEntry(
      contactId,
      'whatsapp_sent',
      `Mensaje de WhatsApp enviado a ${contactName}: "${truncatedMessage}"`
    );
  };

  const logBudgetCreated = async (contactId: string, budgetTitle: string, budgetId: string) => {
    await addContactHistoryEntry(
      contactId,
      'budget_created',
      `Presupuesto creado: "${budgetTitle}" (ID: ${budgetId})`
    );
  };

  const logNoteAdded = async (contactId: string, note: string) => {
    const truncatedNote = note.length > 100 ? note.substring(0, 100) + '...' : note;
    await addContactHistoryEntry(
      contactId,
      'note_added',
      `Nota agregada: "${truncatedNote}"`
    );
  };

  const logEmailSent = async (contactId: string, subject: string, recipient: string) => {
    await addContactHistoryEntry(
      contactId,
      'email_sent',
      `Email enviado a ${recipient}: "${subject}"`
    );
  };

  const logStatusChange = async (contactId: string, contactName: string, oldStatus: string, newStatus: string) => {
    await addContactHistoryEntry(
      contactId,
      'status_change',
      `Estado cambiado de "${oldStatus}" a "${newStatus}" para ${contactName}`
    );
  };

  const logAssignmentChange = async (contactId: string, contactName: string, newAssignee: string) => {
    await addContactHistoryEntry(
      contactId,
      'assignment_change',
      `${contactName} asignado a ${newAssignee}`
    );
  };

  return {
    addContactHistoryEntry,
    logContactCreated,
    logContactUpdated,
    logTaskCreated,
    logTaskCompleted,
    logWhatsAppSent,
    logBudgetCreated,
    logNoteAdded,
    logEmailSent,
    logStatusChange,
    logAssignmentChange,
  };
}