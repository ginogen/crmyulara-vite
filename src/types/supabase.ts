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
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      branches: {
        Row: Branch;
        Insert: Omit<Branch, 'id' | 'created_at'>;
        Update: Partial<Omit<Branch, 'id' | 'created_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, 'id' | 'created_at'>;
        Update: Partial<Omit<Contact, 'id' | 'created_at'>>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at'>;
        Update: Partial<Omit<Lead, 'id' | 'created_at'>>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at'>;
        Update: Partial<Omit<Task, 'id' | 'created_at'>>;
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, 'id' | 'created_at'>;
        Update: Partial<Omit<Budget, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export interface Organization {
  id: string;
  created_at: string;
  name: string;
  custom_name: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';
  organization_id?: string;
  branch_id?: string;
  created_at: string;
}

export type Contact = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  tag: string;
  organization_id: string;
  branch_id: string;
  assigned_to: string;
  origin?: string;
  pax_count?: number;
  estimated_travel_date?: string;
  original_lead_id?: string;
  original_lead_status?: string;
  original_lead_inquiry_number?: string;
  destination_of_interest?: string;
  estimated_budget?: number;
  additional_notes?: string;
};

export type Lead = {
  id: string;
  created_at: string;
  inquiry_number: string;
  full_name: string;
  email: string | null;
  status: 'new' | 'assigned' | 'contacted' | 'followed' | 'interested' | 'reserved' | 'liquidated' | 'effective_reservation' | 'archived';
  assigned_to: string | null;
  origin: string;
  province: string;
  phone: string;
  pax_count: number;
  estimated_travel_date: string;
  organization_id: string;
  branch_id: string;
  converted_to_contact: boolean | null;
};

export type Task = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  due_date: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  related_to_type: 'lead' | 'contact';
  related_to_id: string;
  assigned_to: string;
  organization_id: string;
  branch_id: string;
};

export type Budget = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  amount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  assigned_to: string;
  organization_id: string;
  branch_id: string;
};

export type FacebookIntegration = {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  branch_id: string;
  page_id: string;
  page_name?: string;
  page_access_token?: string;
  form_id: string;
  form_name?: string;
  active: boolean;
  last_sync?: string;
};

export type FacebookLead = {
  id: string;
  created_at: string;
  facebook_lead_id: string;
  form_id: string;
  page_id: string;
  organization_id: string;
  branch_id: string;
  lead_data: any;
  processed: boolean;
  converted_to_lead: boolean;
  lead_id?: string;
  conversion_date?: string;
};

export type RuleType = 'campaign' | 'province';

export interface Rule {
  id: string;
  organization_id: string;
  type: RuleType;
  condition: string;
  assigned_users: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
} 