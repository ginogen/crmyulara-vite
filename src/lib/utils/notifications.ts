import { createClient } from '../supabase/client';
import { Database } from '../supabase/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];

export async function getTodayTasks(userId: string): Promise<Task[]> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .gte('due_date', today.toISOString())
    .lte('due_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error getting today tasks:', error);
    return [];
  }

  return tasks;
}

export async function getOverdueTasks(userId: string): Promise<Task[]> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .lt('due_date', today.toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error getting overdue tasks:', error);
    return [];
  }

  return tasks;
}

export async function getUpcomingTasks(userId: string, days: number = 7): Promise<Task[]> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + days);
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .gte('due_date', today.toISOString())
    .lte('due_date', endDate.toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error getting upcoming tasks:', error);
    return [];
  }

  return tasks;
}

export async function subscribeToTaskUpdates(
  userId: string,
  callback: (payload: any) => void
) {
  const supabase = createClient();
  
  const channel = supabase
    .channel('tasks')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `assigned_to=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
} 