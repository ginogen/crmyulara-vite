import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { createClient } from '@/lib/supabase/client';

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        // Obtener nombre de organización
        if (data.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', data.organization_id)
            .single();
          setOrgName(org?.name || '');
        }
        // Obtener nombre de sucursal
        if (data.branch_id) {
          const { data: branch } = await supabase
            .from('branches')
            .select('name')
            .eq('id', data.branch_id)
            .single();
          setBranchName(branch?.name || '');
        }
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    const supabase = createClient();
    // Actualizar solo el nombre completo
    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', profile.id);
    setIsSaving(false);
    if (!error) {
      alert('Perfil actualizado');
    } else {
      alert('Error al actualizar el perfil');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">No autenticado</h2>
        <p className="mt-2 text-gray-600">Por favor inicia sesión para ver tu perfil.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <span>Cargando perfil...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <Breadcrumb
        items={[
          { label: 'Administración', href: '/admin' },
          { label: 'Mi Perfil' },
        ]}
      />
      <h1 className="text-2xl font-semibold text-gray-900">Mi Perfil</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">ID</label>
          <Input value={profile?.id || ''} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <Input value={profile?.email || ''} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
          <Input value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Rol</label>
          <Input value={profile?.role || ''} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Organización</label>
          <Input value={orgName || profile?.organization_id || ''} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sucursal</label>
          <Input value={branchName || profile?.branch_id || ''} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de creación</label>
          <Input value={profile?.created_at ? new Date(profile.created_at).toLocaleString('es-ES') : ''} disabled />
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}

export default ProfilePage; 