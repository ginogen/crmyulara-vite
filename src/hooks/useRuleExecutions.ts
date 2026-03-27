import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface RuleExecution {
  id: string;
  rule_id: string | null;
  lead_id: string | null;
  rule_type: string;
  rule_condition: string;
  matched_value: string;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  lead_name: string | null;
  lead_inquiry_number: string | null;
  created_at: string;
}

export function useRuleExecutions(organizationId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['rule_executions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_executions')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as RuleExecution[];
    },
    enabled: !!organizationId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
