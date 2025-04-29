import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog } from '@headlessui/react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const WARNING_TIMEOUT = 5 * 60 * 1000; // 5 minutos

export function InactivityHandler() {
  const { signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setShowWarning(false);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        signOut();
      } else if (timeSinceLastActivity >= WARNING_TIMEOUT) {
        setShowWarning(true);
      }
    };

    const interval = setInterval(checkInactivity, 1000);
    return () => clearInterval(interval);
  }, [lastActivity, signOut]);

  return (
    <Dialog
      open={showWarning}
      onClose={() => setShowWarning(false)}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6">
          <Dialog.Title className="text-lg font-medium">
            Sesión inactiva
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-500">
            Tu sesión se cerrará automáticamente en 5 minutos debido a la inactividad.
          </Dialog.Description>

          <div className="mt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowWarning(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                setLastActivity(Date.now());
                setShowWarning(false);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Mantener sesión
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 