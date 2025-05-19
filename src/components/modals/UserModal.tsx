import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const roleLabels = {
  super_admin: 'Super Admin',
  org_admin: 'Admin de Organización',
  branch_manager: 'Gerente de Sucursal',
  sales_agent: 'Agente de Ventas',
};

export function UserModal({
  isOpen,
  onClose,
  user,
  onSubmit,
  organizations,
  branches,
}: {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onSubmit: (data: any) => void;
  organizations: { id: string; name: string }[];
  branches: { id: string; name: string }[];
}) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'sales_agent',
    organization_id: '',
    branch_id: '',
    password: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'sales_agent',
        organization_id: user.organization_id || '',
        branch_id: user.branch_id || '',
        password: '',
      });
    } else {
      setForm({
        full_name: '',
        email: '',
        role: 'sales_agent',
        organization_id: '',
        branch_id: '',
        password: '',
      });
    }
  }, [user, isOpen]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              {user ? 'Editar Usuario' : 'Nuevo Usuario'}
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 6L14 14M6 14L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre completo</label>
              <Input
                value={form.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                required
              />
            </div>
            {!user && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                  required={!user}
                  minLength={6}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rol</label>
              <Select value={form.role} onValueChange={v => handleChange('role', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Organización</label>
              <Select value={form.organization_id} onValueChange={v => handleChange('organization_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar organización" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
              <Select value={form.branch_id} onValueChange={v => handleChange('branch_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" variant="default">Guardar</Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 