export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          custom_name: string
          created_at: string
        }
        Insert: {
          id?: string
          custom_name: string
          created_at?: string
        }
        Update: {
          id?: string
          custom_name?: string
          created_at?: string
        }
      }
      branches: {
        Row: {
          id: string
          organization_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent'
          organization_id: string | null
          branch_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role: 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent'
          organization_id?: string | null
          branch_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent'
          organization_id?: string | null
          branch_id?: string | null
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          full_name: string
          city: string
          province: string
          phone: string
          email: string
          tag: string
          assigned_to: string
          organization_id: string
          branch_id: string
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          city: string
          province: string
          phone: string
          email: string
          tag: string
          assigned_to: string
          organization_id: string
          branch_id: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          city?: string
          province?: string
          phone?: string
          email?: string
          tag?: string
          assigned_to?: string
          organization_id?: string
          branch_id?: string
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          inquiry_number: string
          full_name: string
          status: 'new' | 'assigned' | 'contacted' | 'followed' | 'interested' | 'reserved' | 'liquidated' | 'effective_reservation'
          assigned_to: string | null
          origin: string
          province: string
          phone: string
          pax_count: number
          estimated_travel_date: string
          organization_id: string
          branch_id: string
          created_at: string
          converted_to_contact: boolean | null
        }
        Insert: {
          id?: string
          inquiry_number: string
          full_name: string
          status: 'new' | 'assigned' | 'contacted' | 'followed' | 'interested' | 'reserved' | 'liquidated' | 'effective_reservation'
          assigned_to?: string | null
          origin: string
          province: string
          phone: string
          pax_count: number
          estimated_travel_date: string
          organization_id: string
          branch_id: string
          created_at?: string
          converted_to_contact?: boolean | null
        }
        Update: {
          id?: string
          inquiry_number?: string
          full_name?: string
          status?: 'new' | 'assigned' | 'contacted' | 'followed' | 'interested' | 'reserved' | 'liquidated' | 'effective_reservation'
          assigned_to?: string | null
          origin?: string
          province?: string
          phone?: string
          pax_count?: number
          estimated_travel_date?: string
          organization_id?: string
          branch_id?: string
          created_at?: string
          converted_to_contact?: boolean | null
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string
          due_date: string
          status: 'pending' | 'completed'
          assigned_to: string
          related_to_type: 'lead' | 'contact'
          related_to_id: string
          organization_id: string
          branch_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          due_date: string
          status: 'pending' | 'completed'
          assigned_to: string
          related_to_type: 'lead' | 'contact'
          related_to_id: string
          organization_id: string
          branch_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          due_date?: string
          status?: 'pending' | 'completed'
          assigned_to?: string
          related_to_type?: 'lead' | 'contact'
          related_to_id?: string
          organization_id?: string
          branch_id?: string
          created_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          title: string
          description: string
          amount: number
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          assigned_to: string
          organization_id: string
          branch_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          amount: number
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          assigned_to: string
          organization_id: string
          branch_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          amount?: number
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          assigned_to?: string
          organization_id?: string
          branch_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
  
  facebook_integrations: {
    Row: {
      id: string
      created_at: string
      updated_at: string
      organization_id: string
      branch_id: string
      page_id: string
      page_name: string | null
      page_access_token: string | null
      form_id: string
      form_name: string | null
      active: boolean
      last_sync: string | null
    }
    Insert: {
      id?: string
      created_at?: string
      updated_at?: string
      organization_id: string
      branch_id: string
      page_id: string
      page_name?: string | null
      page_access_token?: string | null
      form_id: string
      form_name?: string | null
      active?: boolean
      last_sync?: string | null
    }
    Update: {
      id?: string
      created_at?: string
      updated_at?: string
      organization_id?: string
      branch_id?: string
      page_id?: string
      page_name?: string | null
      page_access_token?: string | null
      form_id?: string
      form_name?: string | null
      active?: boolean
      last_sync?: string | null
    }
  }
  
  facebook_leads: {
    Row: {
      id: string
      created_at: string
      facebook_lead_id: string
      form_id: string
      page_id: string
      organization_id: string
      branch_id: string
      lead_data: any
      processed: boolean
      converted_to_lead: boolean
      lead_id: string | null
      conversion_date: string | null
    }
    Insert: {
      id?: string
      created_at?: string
      facebook_lead_id: string
      form_id: string
      page_id: string
      organization_id: string
      branch_id: string
      lead_data?: any
      processed?: boolean
      converted_to_lead?: boolean
      lead_id?: string | null
      conversion_date?: string | null
    }
    Update: {
      id?: string
      created_at?: string
      facebook_lead_id?: string
      form_id?: string
      page_id?: string
      organization_id?: string
      branch_id?: string
      lead_data?: any
      processed?: boolean
      converted_to_lead?: boolean
      lead_id?: string | null
      conversion_date?: string | null
    }
  }
} 