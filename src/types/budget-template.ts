export interface HeaderConfig {
  show_logo: boolean;
  logo_url: string | null;
  logo_size: 'small' | 'medium' | 'large';
  agency_name: string;
  agency_address: string;
  agency_phone: string;
  agency_email: string;
  agency_website?: string;
  show_client_data: boolean;
  header_bg_color: string;
  text_color: string;
  layout: 'left' | 'center' | 'right' | 'split';
}

export interface FooterConfig {
  show_footer: boolean;
  text: string;
  bg_color: string;
  text_color: string;
  alignment: 'left' | 'center' | 'right';
  font_size: 'small' | 'medium' | 'large';
  padding: 'small' | 'medium' | 'large';
}

export interface BudgetTemplate {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  organization_id: string;
  branch_id: string;
  created_by: string;
  header_config: HeaderConfig;
  footer_config: FooterConfig;
  default_content: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface CreateBudgetTemplateData {
  name: string;
  description?: string;
  organization_id: string;
  branch_id: string;
  header_config: HeaderConfig;
  footer_config: FooterConfig;
  default_content?: string;
  is_default?: boolean;
}

export interface UpdateBudgetTemplateData extends Partial<CreateBudgetTemplateData> {
  id: string;
}

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  show_logo: true,
  logo_url: null,
  logo_size: 'medium',
  agency_name: '',
  agency_address: '',
  agency_phone: '',
  agency_email: '',
  agency_website: '',
  show_client_data: true,
  header_bg_color: '#ffffff',
  text_color: '#1f2937',
  layout: 'split'
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  show_footer: true,
  text: 'Gracias por confiar en nosotros',
  bg_color: '#f8f9fa',
  text_color: '#6b7280',
  alignment: 'center',
  font_size: 'medium',
  padding: 'medium'
};