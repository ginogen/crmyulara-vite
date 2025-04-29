import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ClipboardIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface MakeIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MakeIntegrationModal({
  isOpen,
  onClose,
}: MakeIntegrationModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { user, currentOrganization, currentBranch } = useAuth();

  // URL base para el webhook
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  
  // URL completa del webhook (esto debería apuntar a tu endpoint real)
  const webhookUrl = `${baseUrl}/api/integrations/make/webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-medium">
              Integración con Make
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4 max-h-[80vh] overflow-y-auto">
            <p className="mb-4 text-sm text-gray-600">
              Configura Make (anteriormente Integromat) para enviar leads automáticamente a tu CRM.
            </p>
            
            <div className="mt-4 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Configuración en Make</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Sigue estos pasos para configurar la integración con Make:
                </p>
                <ol className="mt-3 list-decimal list-inside text-sm text-gray-500 space-y-2">
                  <li>Crea una cuenta en <a href="https://www.make.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">Make.com</a> si aún no tienes una.</li>
                  <li>Crea un nuevo escenario.</li>
                  <li>Añade el módulo "Facebook Lead Ads" → "Watch Leads".</li>
                  <li>Conecta tu cuenta de Facebook y selecciona la página y formulario.</li>
                  <li>Añade el módulo "HTTP" → "Make a request" configurado como POST.</li>
                  <li>Usa la siguiente URL para el webhook:</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <code className="text-sm text-gray-800">{webhookUrl}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {isCopied && (
                  <div className="mt-1 text-xs text-green-600">
                    ¡Copiado al portapapeles!
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Datos a enviar</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Configura el cuerpo de la petición HTTP en Make con el siguiente formato:
                </p>
                <div className="mt-3 bg-gray-50 rounded-md p-3">
                  <pre className="text-xs text-gray-800 overflow-x-auto">
{`{
  "organization_id": "${currentOrganization?.id || '[ID_DE_ORGANIZACIÓN]'}",
  "branch_id": "${currentBranch?.id || '[ID_DE_SUCURSAL]'}",
  "form_id": "{{123456789}}", // ID del formulario de Facebook
  "page_id": "{{123456789}}", // ID de la página de Facebook
  "facebook_lead_id": "{{1.id}}", // ID del lead de Facebook
  "lead_data": {
    // Mapea aquí los campos del formulario de Facebook
    "full_name": "{{1.full_name}}",
    "email": "{{1.email}}",
    "phone": "{{1.phone_number}}",
    "province": "{{1.province}}",
    "pax_count": "{{1.pax}}", // Número de pasajeros (ejemplo: "2")
    "estimated_travel_date": "{{1.travel_date}}", // Fecha de viaje (ejemplo: "2023-12-15") 
    "origin": "{{1.origin}}" // Origen del lead (ejemplo: "Facebook Ads", "Instagram")
  },
  "auto_convert": true, // Si quieres que el lead se cree automáticamente
  "assigned_to": null // Opcional: ID del usuario asignado
}`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`{
  "organization_id": "${currentOrganization?.id || '[ID_DE_ORGANIZACIÓN]'}",
  "branch_id": "${currentBranch?.id || '[ID_DE_SUCURSAL]'}",
  "form_id": "{{123456789}}",
  "page_id": "{{123456789}}",
  "facebook_lead_id": "{{1.id}}",
  "lead_data": {
    "full_name": "{{1.full_name}}",
    "email": "{{1.email}}",
    "phone": "{{1.phone_number}}",
    "province": "{{1.province}}",
    "pax_count": "{{1.pax}}",
    "estimated_travel_date": "{{1.travel_date}}",
    "origin": "{{1.origin}}"
  },
  "auto_convert": true,
  "assigned_to": null
}`)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-500"
                  >
                    Copiar ejemplo
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Configuración del Content Type</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Asegúrate de configurar el Content Type como <code className="bg-gray-50 px-1 py-0.5 rounded">application/json</code> en la configuración de la petición HTTP.
                </p>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 