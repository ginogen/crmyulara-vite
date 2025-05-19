import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MakeIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MakeIntegrationModal = ({
  isOpen,
  onClose,
}: MakeIntegrationModalProps) => {
  const { currentOrganization, currentBranch } = useAuth();
  const [webhookSecret, setWebhookSecret] = useState('');
  const [generatingSecret, setGeneratingSecret] = useState(false);

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : '';
  
  const webhookUrl = `${baseUrl}/api/webhooks/make`;

  const generateSecret = () => {
    setGeneratingSecret(true);
    // Generar un secreto aleatorio
    const randomSecret = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    setWebhookSecret(randomSecret);
    setGeneratingSecret(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Cerrar</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      Integración con Make (Integromat)
                    </Dialog.Title>

                    <div className="mt-4 space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Configuración de Make</h4>
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
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Secreto del Webhook</h4>
                        <p className="mt-1 text-sm text-gray-500">
                          Genera un secreto para autenticar las peticiones de Make:
                        </p>
                        <div className="mt-3 flex">
                          <input
                            type="text"
                            className="flex-grow min-w-0 block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            value={webhookSecret}
                            readOnly
                            placeholder="Haz clic en 'Generar secreto'"
                          />
                          <button
                            type="button"
                            onClick={generateSecret}
                            disabled={generatingSecret}
                            className="ml-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            {generatingSecret ? 'Generando...' : 'Generar secreto'}
                          </button>
                          {webhookSecret && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(webhookSecret)}
                              className="ml-2 inline-flex items-center p-1.5 border border-transparent rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Añade este secreto como header "x-webhook-secret" en la configuración del módulo HTTP en Make.
                        </p>
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
                        <h4 className="text-sm font-medium text-gray-900">Notas importantes</h4>
                        <ul className="mt-2 list-disc list-inside text-xs text-gray-500 space-y-1">
                          <li>Los campos <code className="bg-gray-100 px-1 rounded">pax_count</code>, <code className="bg-gray-100 px-1 rounded">estimated_travel_date</code> y <code className="bg-gray-100 px-1 rounded">origin</code> son nuevos y opcionales.</li>
                          <li>Si no se especifica <code className="bg-gray-100 px-1 rounded">origin</code>, se usará "Facebook Ads" por defecto.</li>
                          <li>Si no se especifica <code className="bg-gray-100 px-1 rounded">pax_count</code>, se usará 1 por defecto.</li>
                          <li>Si no se especifica <code className="bg-gray-100 px-1 rounded">estimated_travel_date</code>, se usará la fecha actual.</li>
                          <li>Asegúrate de que los nombres de los campos en Make coincidan con los especificados en el ejemplo.</li>
                        </ul>
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="button"
                          className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                          onClick={onClose}
                        >
                          Listo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};