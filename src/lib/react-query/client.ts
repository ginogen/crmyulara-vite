import { QueryClient } from '@tanstack/react-query';

// Crear una instancia de QueryClient que será utilizada en toda la aplicación
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
      retryOnMount: true,
      retry: (failureCount, error) => {
        // No reintentar errores de autenticación
        if (error instanceof Error && 
            (error.message.includes('JWT') || 
             error.message.includes('session') || 
             error.message.includes('auth') || 
             error.message.includes('token'))) {
          return false;
        }
        return failureCount < 2; // Intentar hasta 2 veces para otros errores
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Espera exponencial
    },
    mutations: {
      retry: (failureCount, error) => {
        // No reintentar errores de autenticación
        if (error instanceof Error && 
            (error.message.includes('JWT') || 
             error.message.includes('session') || 
             error.message.includes('auth') || 
             error.message.includes('token'))) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
}); 