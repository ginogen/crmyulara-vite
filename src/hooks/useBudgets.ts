import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/lib/supabase/database.types';

type Budget = Database['public']['Tables']['budgets']['Row'];

export function useBudgets(organizationId?: string, branchId?: string) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Si no tenemos organizationId o branchId, devolver una lista vacía y loading=false
  useEffect(() => {
    if (!organizationId || !branchId) {
      setBudgets([]);
      setIsLoading(false);
    }
  }, [organizationId, branchId]);

  const { data, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ['budgets', organizationId, branchId],
    queryFn: async () => {
      if (!organizationId || !branchId) {
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error al cargar presupuestos';
        setError(errorMsg);
        return [];
      }
    },
    enabled: !!organizationId && !!branchId,
  });

  // Actualizar el estado local cuando los datos de la consulta cambian
  useEffect(() => {
    if (data) {
      setBudgets(data);
      setIsLoading(false);
    }
  }, [data]);

  const createBudget = useMutation({
    mutationFn: async (budget: Partial<Budget>) => {
      const { data, error } = await supabase
        .from('budgets')
        .insert([budget])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', organizationId, branchId] });
    },
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Budget>) => {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', organizationId, branchId] });
    },
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', organizationId, branchId] });
    },
  });

  return {
    budgets,
    isLoading: queryLoading || isLoading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    fetchBudgets: refetch,
  };
} 