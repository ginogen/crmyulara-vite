import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/database.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Lead = Database['public']['Tables']['leads']['Row'];

export function useLeads(organizationId?: string, branchId?: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Si no tenemos organizationId o branchId, devolver una lista vacía y loading=false
  useEffect(() => {
    if (!organizationId || !branchId) {
      setLeads([]);
      setLoading(false);
    }
  }, [organizationId, branchId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', organizationId, branchId],
    queryFn: async () => {
      if (!organizationId || !branchId) {
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('branch_id', branchId)
          .is('converted_to_contact', false)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error al cargar los leads';
        setError(errorMessage);
        return [];
      }
    },
    enabled: !!organizationId && !!branchId,
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

  return {
    leads,
    loading: isLoading || loading,
    error,
    createLead: createLeadMutation,
    updateLead: updateLeadMutation,
    updateLeadStatus,
    updateLeadAssignment,
    refetch
  };
} 