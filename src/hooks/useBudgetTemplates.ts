import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { BudgetTemplate, CreateBudgetTemplateData, UpdateBudgetTemplateData } from '@/types/budget-template';

export function useBudgetTemplates(organizationId?: string, branchId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const templatesQuery = useQuery({
    queryKey: ['budget-templates', organizationId, branchId],
    queryFn: async (): Promise<BudgetTemplate[]> => {
      if (!organizationId || !branchId) {
        return [];
      }

      const { data, error } = await supabase
        .from('budget_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching budget templates:', error);
        throw error;
      }

      return data;
    },
    enabled: !!organizationId && !!branchId,
  });

  const createTemplate = useMutation({
    mutationFn: async (data: CreateBudgetTemplateData): Promise<BudgetTemplate> => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Si es plantilla por defecto, desactivar otras plantillas por defecto
      if (data.is_default) {
        await supabase
          .from('budget_templates')
          .update({ is_default: false })
          .eq('organization_id', data.organization_id)
          .eq('branch_id', data.branch_id);
      }

      const { data: template, error } = await supabase
        .from('budget_templates')
        .insert({
          ...data,
          created_by: user.id,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating budget template:', error);
        throw error;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (data: UpdateBudgetTemplateData): Promise<BudgetTemplate> => {
      const { id, ...updateData } = data;

      // Si es plantilla por defecto, desactivar otras plantillas por defecto
      if (updateData.is_default) {
        await supabase
          .from('budget_templates')
          .update({ is_default: false })
          .eq('organization_id', updateData.organization_id!)
          .eq('branch_id', updateData.branch_id!)
          .neq('id', id);
      }

      const { data: template, error } = await supabase
        .from('budget_templates')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating budget template:', error);
        throw error;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const { error } = await supabase
        .from('budget_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting budget template:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string): Promise<BudgetTemplate> => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener la plantilla original
      const { data: originalTemplate, error: fetchError } = await supabase
        .from('budget_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Crear copia
      const { data: newTemplate, error: createError } = await supabase
        .from('budget_templates')
        .insert({
          name: `${originalTemplate.name} (Copia)`,
          description: originalTemplate.description,
          organization_id: originalTemplate.organization_id,
          branch_id: originalTemplate.branch_id,
          created_by: user.id,
          header_config: originalTemplate.header_config,
          footer_config: originalTemplate.footer_config,
          default_content: originalTemplate.default_content,
          is_default: false, // Las copias nunca son por defecto
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });

  const setAsDefault = useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const template = templatesQuery.data?.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Plantilla no encontrada');
      }

      // Desactivar otras plantillas por defecto
      await supabase
        .from('budget_templates')
        .update({ is_default: false })
        .eq('organization_id', template.organization_id)
        .eq('branch_id', template.branch_id);

      // Activar esta como por defecto
      const { error } = await supabase
        .from('budget_templates')
        .update({ is_default: true })
        .eq('id', templateId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    setAsDefault,
    refetch: templatesQuery.refetch,
  };
}