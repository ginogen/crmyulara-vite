import type { Database } from '@/lib/supabase/database.types';

export type Budget = Database['public']['Tables']['budgets']['Row']; 