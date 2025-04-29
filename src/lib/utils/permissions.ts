type UserRole = 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';

interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

interface ModulePermissions {
  organizations: Permission;
  branches: Permission;
  users: Permission;
  contacts: Permission;
  leads: Permission;
  tasks: Permission;
  budgets: Permission;
}

const rolePermissions: Record<UserRole, ModulePermissions> = {
  super_admin: {
    organizations: { create: true, read: true, update: true, delete: true },
    branches: { create: true, read: true, update: true, delete: true },
    users: { create: true, read: true, update: true, delete: true },
    contacts: { create: true, read: true, update: true, delete: true },
    leads: { create: true, read: true, update: true, delete: true },
    tasks: { create: true, read: true, update: true, delete: true },
    budgets: { create: true, read: true, update: true, delete: true },
  },
  org_admin: {
    organizations: { create: false, read: true, update: true, delete: false },
    branches: { create: true, read: true, update: true, delete: true },
    users: { create: true, read: true, update: true, delete: true },
    contacts: { create: true, read: true, update: true, delete: true },
    leads: { create: true, read: true, update: true, delete: true },
    tasks: { create: true, read: true, update: true, delete: true },
    budgets: { create: true, read: true, update: true, delete: true },
  },
  branch_manager: {
    organizations: { create: false, read: true, update: false, delete: false },
    branches: { create: false, read: true, update: false, delete: false },
    users: { create: true, read: true, update: true, delete: false },
    contacts: { create: true, read: true, update: true, delete: true },
    leads: { create: true, read: true, update: true, delete: true },
    tasks: { create: true, read: true, update: true, delete: true },
    budgets: { create: true, read: true, update: true, delete: true },
  },
  sales_agent: {
    organizations: { create: false, read: true, update: false, delete: false },
    branches: { create: false, read: true, update: false, delete: false },
    users: { create: false, read: false, update: false, delete: false },
    contacts: { create: true, read: true, update: true, delete: false },
    leads: { create: true, read: true, update: true, delete: false },
    tasks: { create: true, read: true, update: true, delete: false },
    budgets: { create: true, read: true, update: true, delete: false },
  },
};

export function hasPermission(
  role: UserRole,
  module: keyof ModulePermissions,
  action: keyof Permission
): boolean {
  return rolePermissions[role][module][action];
}

export function canAccessModule(role: UserRole, module: keyof ModulePermissions): boolean {
  const permissions = rolePermissions[role][module];
  return Object.values(permissions).some(Boolean);
}

export function getModulePermissions(role: UserRole, module: keyof ModulePermissions): Permission {
  return rolePermissions[role][module];
}

export function getAllModulePermissions(role: UserRole): ModulePermissions {
  return rolePermissions[role];
} 