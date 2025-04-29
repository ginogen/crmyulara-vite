import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/database.types';

type User = Database['public']['Tables']['users']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];

export function useAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*');

        if (usersError) throw usersError;

        // Fetch organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .single();

        if (orgError) throw orgError;

        // Fetch branches
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('*');

        if (branchesError) throw branchesError;

        setUsers(usersData || []);
        setOrganization(orgData);
        setBranches(branchesData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  const updateUser = async (userId: string, data: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...data } : user))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
    }
  };

  const updateOrganization = async (data: Partial<Organization>) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', organization?.id);

      if (error) throw error;

      setOrganization((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al actualizar organización'
      );
    }
  };

  const createBranch = async (data: Omit<Branch, 'id' | 'created_at'>) => {
    try {
      const { data: newBranch, error } = await supabase
        .from('branches')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      setBranches((prev) => [...prev, newBranch]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear sucursal');
    }
  };

  const updateBranch = async (branchId: string, data: Partial<Branch>) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update(data)
        .eq('id', branchId);

      if (error) throw error;

      setBranches((prev) =>
        prev.map((branch) =>
          branch.id === branchId ? { ...branch, ...data } : branch
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar sucursal');
    }
  };

  return {
    users,
    organization,
    branches,
    isLoading,
    error,
    updateUser,
    updateOrganization,
    createBranch,
    updateBranch,
  };
} 