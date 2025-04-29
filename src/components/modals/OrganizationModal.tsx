import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Organization = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
};

type OrganizationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  organization?: Organization;
  onSubmit: (data: Omit<Organization, 'id' | 'created_at'>) => Promise<void>;
};

export function OrganizationModal({
  isOpen,
  onClose,
  organization,
  onSubmit,
}: OrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as Organization['status'],
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        description: organization.description || '',
        status: organization.status || 'active',
        contact_name: organization.contact_name || '',
        contact_email: organization.contact_email || '',
        contact_phone: organization.contact_phone || '',
      });
    } else {
      // Reiniciar el formulario para una nueva organización
      setFormData({
        name: '',
        description: '',
        status: 'active',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
      });
    }
  }, [organization]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as unknown as { name: string; value: string };
    setFormData((prev) => ({ ...prev, [target.name]: target.value }));
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target as unknown as { name: string; value: string };
    setFormData((prev) => ({ ...prev, [target.name]: target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la organización');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 md:mx-auto">
        <div className="px-6 pt-6 pb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              {organization ? 'Editar Organización' : 'Nueva Organización'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Cerrar</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre *
              </label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleTextAreaChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700"
              >
                Estado
              </label>
              <Select value={formData.status} onValueChange={(value: string) => setFormData({ ...formData, status: value as Organization['status'] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="contact_name"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre de Contacto
              </label>
              <Input
                type="text"
                id="contact_name"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="contact_email"
                className="block text-sm font-medium text-gray-700"
              >
                Email de Contacto
              </label>
              <Input
                type="email"
                id="contact_email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="contact_phone"
                className="block text-sm font-medium text-gray-700"
              >
                Teléfono de Contacto
              </label>
              <Input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : organization
                  ? 'Actualizar'
                  : 'Crear'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 