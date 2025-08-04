import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useContactHistory } from '@/hooks/useContactHistory';
import { toast } from 'sonner';
import { formatPhoneNumber } from '@/lib/utils/strings';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    id: string;
    full_name: string;
    phone: string;
  };
}

interface Template {
  id: string;
  name: string;
  content: string;
}

export function WhatsAppModal({ isOpen, onClose, contact }: WhatsAppModalProps) {
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { currentOrganization, user } = useAuth();
  const { logWhatsAppSent } = useContactHistory();

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!currentOrganization) return;

      const supabase = createClient();
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('organization_id', currentOrganization.id);
      
      if (error) {
        console.error('Error fetching templates:', error);
        toast.error('Error al cargar las plantillas');
        return;
      }

      setTemplates(data || []);
    };

    fetchTemplates();
  }, [currentOrganization]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      let content = template.content;
      // Reemplazar variables
      content = content.replace(/\{nombre\}/g, contact.full_name);
      setMessage(content);
    }
  };

  const handleSaveTemplate = async () => {
    if (!message.trim() || !currentOrganization) return;

    const supabase = createClient();
    const templateName = prompt('Nombre de la plantilla:');
    if (!templateName) return;

    const { data, error } = await supabase
      .from('whatsapp_templates')
      .insert([
        {
          name: templateName,
          content: message,
          organization_id: currentOrganization.id
        }
      ])
      .select();

    if (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar la plantilla');
      return;
    }

    if (data) {
      setTemplates([...templates, data[0]]);
      toast.success('Plantilla guardada correctamente');
    }
  };

  const saveMessageToHistory = async () => {
    if (!currentOrganization || !user) return;

    const supabase = createClient();
    
    // Guardar en whatsapp_messages
    const { error } = await supabase
      .from('whatsapp_messages')
      .insert([
        {
          contact_id: contact.id,
          message: message,
          organization_id: currentOrganization.id,
          sent_by: user.id
        }
      ]);

    if (error) {
      console.error('Error saving message to history:', error);
      toast.error('Error al guardar el mensaje en el historial');
      return;
    }

    // Verificar si este contacto tiene un lead asociado para registrar en lead_history
    const { data: contactWithLead } = await supabase
      .from('contacts')
      .select('original_lead_id')
      .eq('id', contact.id)
      .single();

    // Si el contacto tiene un lead asociado, registrar en lead_history
    if (contactWithLead?.original_lead_id) {
      await supabase.from('lead_history').insert({
        lead_id: contactWithLead.original_lead_id,
        user_id: user.id,
        action: 'whatsapp_sent',
        description: `Mensaje de WhatsApp enviado a ${contact.full_name}: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
      });
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    
    // Formatear número de teléfono (eliminar espacios y caracteres especiales)
    const phoneNumber = contact.phone.replace(/\D/g, '');
    
    // Crear URL de WhatsApp Web usando el formato wa.me
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Guardar en el historial
    await saveMessageToHistory();
    
    // Registrar en historial del contacto
    await logWhatsAppSent(contact.id, contact.full_name, message);
    
    // Abrir en nueva pestaña
    window.open(whatsappUrl, '_blank');
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Enviar mensaje por WhatsApp
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center space-x-2 text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span className="font-medium">{formatPhoneNumber(contact.phone)}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 mt-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{contact.full_name}</span>
          </div>
        </div>
        
        <div className="grid gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-700">Plantillas:</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value="">Seleccionar plantilla</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-700">Mensaje:</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={8}
              className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            />
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Variables disponibles: {"{nombre}"} - Nombre del contacto</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={handleSaveTemplate}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Guardar como plantilla
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 