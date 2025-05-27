import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rule } from '@/types/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Lead = Database['public']['Tables']['leads']['Row'];

// Función para obtener un usuario aleatorio de un array de IDs
function getRandomUser(userIds: string[]): string {
  return userIds[Math.floor(Math.random() * userIds.length)];
}

export function useLeads(organizationId?: string, branchId?: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();

  // Función para obtener las reglas activas
  const getActiveRules = async (orgId: string): Promise<Rule[]> => {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (error) {
      console.error('Error al obtener reglas:', error);
      return [];
    }

    return data || [];
  };

  // Función para aplicar las reglas a un lead
  const applyRules = async (lead: Lead): Promise<string | null> => {
    if (!lead.organization_id) return null;

    const rules = await getActiveRules(lead.organization_id);
    
    for (const rule of rules) {
      let matches = false;

      if (rule.type === 'campaign' && lead.origin) {
        // Comprobar si el origen del lead contiene la condición de la regla (case insensitive)
        matches = lead.origin.toLowerCase().includes(rule.condition.toLowerCase());
      } else if (rule.type === 'province' && lead.province) {
        // Comprobar si la provincia del lead coincide con la condición de la regla (case insensitive)
        matches = lead.province.toLowerCase() === rule.condition.toLowerCase();
      }

      if (matches && rule.assigned_users.length > 0) {
        // Seleccionar un usuario aleatorio de los asignados a la regla
        return getRandomUser(rule.assigned_users);
      }
    }

    return null;
  };

  // Si no tenemos organizationId o branchId, devolver una lista vacía y loading=false
  useEffect(() => {
    if (!organizationId || !branchId) {
      setLeads([]);
      setLoading(false);
    }
  }, [organizationId, branchId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', organizationId, branchId, userRole, user?.id],
    queryFn: async () => {
      if (!organizationId || !branchId) {
        return [];
      }

      try {
        let query = supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        // Aplicar filtros según el rol del usuario
        if (userRole === 'super_admin') {
          // Super admin puede ver todos los leads
        } else if (userRole === 'org_admin') {
          // Org admin solo puede ver leads de su organización
          query = query.eq('organization_id', organizationId);
        } else {
          // branch_manager y sales_agent solo pueden ver leads asignados a ellos
          query = query
            .eq('organization_id', organizationId)
            .eq('branch_id', branchId)
            .eq('assigned_to', user?.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar los leads';
        setError(errorMessage);
        return [];
      }
    },
    enabled: !!organizationId && !!branchId && !!userRole && !!user?.id,
  });

  // Actualizar el estado local cuando los datos de la consulta cambian
  useEffect(() => {
    if (data) {
      setLeads(data);
      setLoading(false);
    }
  }, [data]);

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: Omit<Lead, 'id' | 'created_at'>) => {
      // Si no hay un usuario asignado, intentar aplicar las reglas
      if (!leadData.assigned_to) {
        const assignedUser = await applyRules(leadData as Lead);
        if (assignedUser) {
          leadData.assigned_to = assignedUser;
        }
      }

      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId, branchId] });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Lead>) => {
      // Si se está actualizando el origen o la provincia y no hay un usuario asignado,
      // intentar aplicar las reglas
      if ((updates.origin || updates.province) && !updates.assigned_to) {
        const { data: currentLead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();

        if (currentLead) {
          const updatedLead = { ...currentLead, ...updates };
          const assignedUser = await applyRules(updatedLead);
          if (assignedUser) {
            updates.assigned_to = assignedUser;
          }
        }
      }

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId, branchId] });
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: Lead['status'] }) => {
      // Obtener los datos del lead antes de actualizarlo
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) {
        throw leadError;
      }

      // Estados que convierten un lead en contacto
      const contactStates: Lead['status'][] = ['contacted', 'followed', 'interested', 'reserved', 'liquidated', 'effective_reservation'];

      if (contactStates.includes(status)) {
        // Solo crear contacto si el lead tiene un agente asignado
        if (lead.assigned_to) {
          // Crear el contacto
          const { error: contactError } = await supabase
            .from('contacts')
            .insert([{
              full_name: lead.full_name,
              email: null, // El email será null por defecto
              phone: lead.phone,
              city: lead.province, // Usamos la provincia como ciudad ya que es el dato más cercano que tenemos
              province: lead.province,
              tag: status, // Usamos el estado como etiqueta inicial
              organization_id: lead.organization_id,
              branch_id: lead.branch_id,
              assigned_to: lead.assigned_to,
              // Campos adicionales del lead
              origin: lead.origin,
              pax_count: lead.pax_count,
              estimated_travel_date: lead.estimated_travel_date,
              original_lead_id: lead.id,
              original_lead_status: status,
              original_lead_inquiry_number: lead.inquiry_number,
            }]);

          if (contactError) {
            throw contactError;
          }

          // En lugar de eliminar el lead, lo marcamos como convertido
          const { error: updateError } = await supabase
            .from('leads')
            .update({ 
              status: status,
              converted_to_contact: true, // Asegurarnos que siempre se marque como convertido
            })
            .eq('id', leadId);

          if (updateError) {
            throw updateError;
          }

          // Registrar en el historial
          await supabase.from('lead_history').insert({
            lead_id: leadId,
            action: 'converted_to_contact',
            description: `Lead convertido a contacto con estado ${status}`,
          });

          return;
        } else {
          // Si no tiene agente asignado, solo actualizar el estado
          const { error } = await supabase
            .from('leads')
            .update({ status })
            .eq('id', leadId);

          if (error) {
            throw error;
          }
        }
      }

      // Si no es un estado que convierte a contacto, actualizar normalmente
      const { error } = await supabase
        .from('leads')
        .update({ 
          status,
          // Asegurarnos que si se cambia de un estado de contacto a estado no-contacto 
          // (aunque esto no debería ocurrir normalmente)
          converted_to_contact: false
        })
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Registrar el cambio en el historial
      await supabase.from('lead_history').insert({
        lead_id: leadId,
        action: 'status_change',
        description: `Estado cambiado a ${status}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId, branchId] });
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId, branchId] });
    },
  });

  const updateLeadAssignment = useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string | null }) => {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: agentId })
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Registrar el cambio en el historial
      await supabase.from('lead_history').insert({
        lead_id: leadId,
        action: 'assignment_change',
        description: agentId ? `Lead asignado` : 'Lead sin asignar',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId, branchId] });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async ({ id, userRole }: { id: string; userRole: string }) => {
      if (userRole !== 'super_admin') {
        throw new Error('Solo un Super Admin puede eliminar leads');
      }
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId, branchId] });
    },
  });

  return {
    leads,
    loading: isLoading || loading,
    error,
    createLead: createLeadMutation,
    updateLead: updateLeadMutation,
    updateLeadStatus,
    updateLeadAssignment,
    deleteLead,
    refetch
  };
} 