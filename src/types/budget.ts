import type { Database } from '@/lib/supabase/database.types';

export interface Budget {
  id: string;
  created_at: string;
  title: string;
  description: string;
  amount: number;
  status: 'not_sent' | 'sent' | 'approved' | 'rejected';
  assigned_to: string;
  organization_id: string;
  branch_id: string;
  contact_id?: string | null;
  lead_id?: string | null;
  template_id?: string | null;
  public_url: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  sent_by: string | null;
} 