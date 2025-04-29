import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

type Organization = {
  id: string;
  name: string;
};

export const OrganizationSettings = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const supabase = createClient();

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .single();

      if (error) throw error;
      setOrganization(data);
      setFormData({ name: data.name });
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: formData.name })
        .eq('id', organization?.id);

      if (error) throw error;
      await fetchOrganization();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !organization) {
    return <div>Cargando información de la organización...</div>;
  }

  return (
    <div className="space-y-4">
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre de la Organización
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              Guardar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setFormData({ name: organization?.name || '' });
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Información de la Organización</h3>
            <p className="mt-1 text-sm text-gray-500">
              Nombre: {organization?.name}
            </p>
          </div>
          <Button onClick={() => setIsEditing(true)}>Editar</Button>
        </div>
      )}
    </div>
  );
}; 