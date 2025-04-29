import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { queryClient } from './client';

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Refrescar las consultas cuando la ventana recibe el foco después de inactividad
  useEffect(() => {
    let lastFocusTime = Date.now();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeInactive = Date.now() - lastFocusTime;
        // Si estuvo inactivo más de 5 minutos, refrescar todas las consultas
        if (timeInactive > 5 * 60 * 1000) {
          console.log('Aplicación inactiva por más de 5 minutos, refrescando datos...');
          queryClient.invalidateQueries();
        }
        lastFocusTime = Date.now();
      }
    };
    
    // Manejar cuando la ventana se hace visible nuevamente
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
} 