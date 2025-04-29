import { Fragment, useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface FacebookIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FacebookIntegrationModal({
  isOpen,
  onClose,
}: FacebookIntegrationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useAuth();

  // Esta es una implementación simplificada. En una implementación real,
  // necesitarías conectarte a la API de Facebook y almacenar los tokens
  // en tu base de datos.
  
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-medium">
              Conectar con Facebook
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4">
            <p className="mb-4 text-sm text-gray-600">
              Conecta tu cuenta de Facebook para recibir leads automáticamente desde tus campañas de Facebook Lead Ads.
            </p>
            
            {error && (
              <div className="bg-red-50 p-3 mb-4 rounded-md">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setError('Esta funcionalidad está en desarrollo. Por favor, inténtalo más tarde.');
                setTimeout(() => setIsLoading(false), 1000);
              }}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>Conectar con Facebook</span>
              )}
            </button>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Cómo funciona</h3>
              <ol className="mt-2 list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Haz clic en el botón "Conectar con Facebook"</li>
                <li>Inicia sesión en tu cuenta de Facebook si es necesario</li>
                <li>Selecciona las páginas de Facebook que quieres conectar</li>
                <li>Selecciona los formularios de Lead Ads que quieres sincronizar</li>
                <li>Confirma los permisos solicitados</li>
              </ol>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 