import { createClient } from '../supabase/client';
import { Database } from '../supabase/database.types';
import { toast } from 'sonner';

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

export async function getTasksWithUpcomingDeadlines(userId: string): Promise<Task[]> {
  const supabase = createClient();
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      contacts(full_name),
      leads(name)
    `)
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .gte('due_date', oneHourFromNow.toISOString())
    .lte('due_date', twoHoursFromNow.toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error getting tasks with upcoming deadlines:', error);
    return [];
  }

  return tasks;
}

export function showTaskDeadlineNotification(task: Task & { contacts?: any, leads?: any }) {
  const dueDate = new Date(task.due_date);
  const timeUntilDue = Math.round((dueDate.getTime() - new Date().getTime()) / (1000 * 60));
  
  let entityName = 'Desconocido';
  if (task.related_to_type === 'contact' && task.contacts) {
    entityName = task.contacts.full_name;
  } else if (task.related_to_type === 'lead' && task.leads) {
    entityName = task.leads.name;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  toast.warning(
    `⏰ Tarea próxima a vencer`,
    {
      description: `"${task.title}" para ${entityName} vence en ${timeUntilDue} minutos (${formatTime(dueDate)})`,
      duration: 10000,
      action: {
        label: 'Ver detalles',
        onClick: () => {
          console.log('Navegando a la tarea:', task.id);
        }
      }
    }
  );
}

// Store to prevent duplicate notifications for the same task in the same hour
const notifiedTasks = new Set<string>();

export async function checkAndNotifyUpcomingTasks(userId: string): Promise<void> {
  try {
    const upcomingTasks = await getTasksWithUpcomingDeadlines(userId);
    
    upcomingTasks.forEach(task => {
      const notificationKey = `${task.id}-${new Date(task.due_date).getHours()}`;
      
      // Only notify if we haven't already notified for this task in this hour
      if (!notifiedTasks.has(notificationKey)) {
        showTaskDeadlineNotification(task);
        notifiedTasks.add(notificationKey);
        
        // Clean up old notifications after 2 hours
        setTimeout(() => {
          notifiedTasks.delete(notificationKey);
        }, 2 * 60 * 60 * 1000);
      }
    });
  } catch (error) {
    console.error('Error checking upcoming tasks:', error);
  }
}

export function clearNotificationCache(): void {
  notifiedTasks.clear();
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