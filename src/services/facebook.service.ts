import { createClient } from '@/lib/supabase/client';

type FacebookLead = {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
};

export class FacebookService {
  private supabase = createClient();

  async getLeads(accessToken: string, formId: string): Promise<FacebookLead[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${formId}/leads?access_token=${accessToken}`
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener leads de Facebook');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error en getLeads:', error);
      throw error;
    }
  }

  async getForms(accessToken: string, pageId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?access_token=${accessToken}`
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener formularios de Facebook');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error en getForms:', error);
      throw error;
    }
  }

  async getPageAccessToken(accessToken: string, pageId: string): Promise<string> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${accessToken}`
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener token de página');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Error en getPageAccessToken:', error);
      throw error;
    }
  }
} 