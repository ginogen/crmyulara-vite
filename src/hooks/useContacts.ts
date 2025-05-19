import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

type Contact = {
  id: string;
  full_name: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  tag: string;
  assigned_to: string;
  organization_id: string;
  branch_id: string;
  created_at: string;
};

export const useContacts = (organizationId?: string, branchId?: string) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();

  // Si no tenemos organizationId o branchId, devolver una lista vacía y loading=false
  useEffect(() => {
    if (!organizationId || !branchId) {
      setContacts([]);
      setIsLoading(false);
    }
  }, [organizationId, branchId]);

  const { data, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ['contacts', organizationId, branchId, userRole, user?.id],
    queryFn: async () => {
      if (!organizationId || !branchId) {
        return [];
      }

      try {
        let query = supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false });

        // Aplicar filtros según el rol del usuario
        if (userRole === 'super_admin') {
          // Super admin puede ver todos los contactos
        } else if (userRole === 'org_admin') {
          // Org admin solo puede ver contactos de su organización
          query = query.eq('organization_id', organizationId);
        } else {
          // branch_manager y sales_agent solo pueden ver contactos asignados a ellos
          query = query
            .eq('organization_id', organizationId)
            .eq('branch_id', branchId)
            .eq('assigned_to', user?.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error al cargar contactos';
        setError(errorMsg);
        return [];
      }
    },
    enabled: !!organizationId && !!branchId && !!userRole && !!user?.id,
  });

  // Actualizar el estado local cuando los datos de la consulta cambian
  useEffect(() => {
    if (data) {
      setContacts(data);
      setIsLoading(false);
    }
  }, [data]);

  const createContact = useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert([contact])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId, branchId] });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Contact>) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId, branchId] });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId, branchId] });
    },
  });

  return {
    contacts,
    isLoading: queryLoading || isLoading,
    error,
    createContact,
    updateContact,
    deleteContact,
    refreshContacts: refetch,
  };
}; 