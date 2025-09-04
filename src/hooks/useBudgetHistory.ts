import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type BudgetHistory = Database['public']['Tables']['budget_history']['Row'];
type Budget = Database['public']['Tables']['budgets']['Row'];

interface BudgetHistoryWithUser extends BudgetHistory {
  created_by_user?: {
    full_name: string;
    email: string;
  } | null;
}

export function useBudgetHistory(budgetId: string) {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const supabase = createClient();

  // Hook para obtener el historial de un presupuesto
  const query = useQuery({
    queryKey: ['budget_history', budgetId],
    queryFn: async (): Promise<BudgetHistoryWithUser[]> => {
      if (!budgetId) {
        return [];
      }

      try {
        let selectQuery = `
          *
        `;

        // Solo super_admin puede ver quién hizo los cambios
        if (userRole === 'super_admin') {
          selectQuery = `
            *,
            created_by_user:users!created_by(
              full_name,
              email
            )
          `;
        }

        const { data, error } = await supabase
          .from('budget_history')
          .select(selectQuery)
          .eq('budget_id', budgetId)
          .order('version_number', { ascending: false });

        if (error) {
          console.error('Error fetching budget history:', error);
          throw error;
        }

        console.log('Budget history loaded:', data?.length || 0, 'versions');
        return data || [];
      } catch (error) {
        console.error('Error in useBudgetHistory:', error);
        throw error;
      }
    },
    enabled: !!budgetId,
    gcTime: 300000, // 5 minutos en caché
    staleTime: 60000, // 1 minuto fresh
  });

  // Mutación para restaurar una versión anterior
  const restoreVersionMutation = useMutation({
    mutationFn: async (historyEntry: BudgetHistory): Promise<Budget> => {
      try {
        console.log('Restoring budget version:', historyEntry.version_number);

        // 1. Actualizar el presupuesto actual con los datos de la versión seleccionada
        const { data: restoredBudget, error: updateError } = await supabase
          .from('budgets')
          .update({
            title: historyEntry.title,
            description: historyEntry.description,
            amount: historyEntry.amount,
            status: historyEntry.status,
            contact_id: historyEntry.contact_id,
            lead_id: historyEntry.lead_id,
            template_id: historyEntry.template_id,
            public_url: historyEntry.public_url,
            pdf_url: historyEntry.pdf_url,
            sent_at: historyEntry.sent_at,
            sent_by: historyEntry.sent_by,
            slug: historyEntry.slug,
          })
          .eq('id', historyEntry.budget_id)
          .select()
          .single();

        if (updateError) {
          console.error('Error restoring budget:', updateError);
          throw updateError;
        }

        if (!restoredBudget) {
          throw new Error('No se pudo restaurar el presupuesto');
        }

        console.log('Budget restored successfully to version:', historyEntry.version_number);
        return restoredBudget;
      } catch (error) {
        console.error('Error in restoreVersion:', error);
        throw error;
      }
    },
    onSuccess: (data, historyEntry) => {
      // Invalidar caché de presupuestos y historial
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget_history', historyEntry.budget_id] });
      
      toast.success(`Presupuesto restaurado a versión ${historyEntry.version_number}`);
    },
    onError: (error) => {
      toast.error(`Error al restaurar versión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  });

  // Función helper para formatear la fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función helper para determinar si se debe mostrar el usuario
  const shouldShowUser = () => {
    return userRole === 'super_admin';
  };

  return {
    history: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    restoreVersion: restoreVersionMutation.mutate,
    isRestoring: restoreVersionMutation.isPending,
    formatDate,
    shouldShowUser,
  };
}