import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type FacebookIntegration = Database['public']['Tables']['facebook_integrations']['Row'];
type FacebookLead = Database['public']['Tables']['facebook_leads']['Row'];

export class FacebookDBService {
  private supabase = createClient();

  async getIntegrations(organizationId: string): Promise<FacebookIntegration[]> {
    const { data, error } = await this.supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data;
  }

  async createIntegration(
    organizationId: string,
    pageId: string,
    pageName: string,
    accessToken: string
  ): Promise<FacebookIntegration> {
    const { data, error } = await this.supabase
      .from('facebook_integrations')
      .insert({
        organization_id: organizationId,
        page_id: pageId,
        page_name: pageName,
        access_token: accessToken,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getLeads(organizationId: string): Promise<FacebookLead[]> {
    const { data, error } = await this.supabase
      .from('facebook_leads')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data;
  }

  async createLead(
    organizationId: string,
    integrationId: string,
    leadData: any
  ): Promise<FacebookLead> {
    const { data, error } = await this.supabase
      .from('facebook_leads')
      .insert({
        organization_id: organizationId,
        integration_id: integrationId,
        lead_data: leadData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateLeadStatus(
    leadId: string,
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected'
  ): Promise<FacebookLead> {
    const { data, error } = await this.supabase
      .from('facebook_leads')
      .update({ status })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
} 