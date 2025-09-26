import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateBudgetSlug, generateUniqueSlug } from '@/lib/utils/slug';
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
      // Generar slug si no se proporciona
      if (!budget.slug) {
        // Obtener datos para generar el slug
        let contactName: string | undefined;
        let leadName: string | undefined;
        
        if (budget.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('full_name')
            .eq('id', budget.contact_id)
            .single();
          contactName = contact?.full_name;
        }
        
        if (budget.lead_id) {
          const { data: lead } = await supabase
            .from('leads')
            .select('full_name')
            .eq('id', budget.lead_id)
            .single();
          leadName = lead?.full_name;
        }
        
        // Generar slug base
        const baseSlug = generateBudgetSlug(contactName, leadName, budget.title);
        
        // Verificar unicidad
        const { data: existingSlugs } = await supabase
          .from('budgets')
          .select('slug')
          .like('slug', `${baseSlug}%`);
        
        const existingSlugValues = existingSlugs?.map(b => b.slug).filter(Boolean) || [];
        budget.slug = generateUniqueSlug(baseSlug, existingSlugValues);
      }
      
      // El trigger de la base de datos se encarga de crear el historial automáticamente
      const { data, error } = await supabase
        .from('budgets')
        .insert([budget])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', organizationId, branchId] });
      // También invalidar el historial del presupuesto creado
      queryClient.invalidateQueries({ queryKey: ['budget_history', data.id] });
    },
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Budget>) => {
      // El trigger de la base de datos se encarga de crear el historial automáticamente
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', organizationId, branchId] });
      // También invalidar el historial del presupuesto actualizado
      queryClient.invalidateQueries({ queryKey: ['budget_history', data.id] });
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