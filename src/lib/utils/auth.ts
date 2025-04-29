import { createClient } from '../supabase/client';
import { Database } from '../supabase/database.types';

type User = Database['public']['Tables']['users']['Row'];

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return userData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getUserOrganization(userId: string) {
  const supabase = createClient();
  
  try {
    const { data: userData } = await supabase
      .from('users')
      .select(`
        organization_id,
        organizations (
          id,
          custom_name
        )
      `)
      .eq('id', userId)
      .single();

    return userData?.organizations || null;
  } catch (error) {
    console.error('Error getting user organization:', error);
    return null;
  }
}

export async function getUserBranch(userId: string) {
  const supabase = createClient();
  
  try {
    const { data: userData } = await supabase
      .from('users')
      .select(`
        branch_id,
        branches (
          id,
          name
        )
      `)
      .eq('id', userId)
      .single();

    return userData?.branches || null;
  } catch (error) {
    console.error('Error getting user branch:', error);
    return null;
  }
} 