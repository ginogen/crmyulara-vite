export type UserRole = 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string;
  branch_id: string;
  user_metadata?: {
    name?: string;
    organization_id?: string;
    branch_id?: string;
  };
} 