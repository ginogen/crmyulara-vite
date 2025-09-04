import { createClient } from '../supabase/client';
import { Database } from '../supabase/database.types';
import { toast } from 'sonner';

let notificationPermission: NotificationPermission = 'default';

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
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .gte('due_date', thirtyMinutesFromNow.toISOString())
    .lte('due_date', sixHoursFromNow.toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error getting tasks with upcoming deadlines:', error);
    return [];
  }

  return tasks;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      notificationPermission = await Notification.requestPermission();
    } else {
      notificationPermission = Notification.permission;
    }
  }
  return notificationPermission;
}

export function showBrowserNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && notificationPermission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);
    
    return notification;
  }
  return null;
}

export async function showTaskDeadlineNotification(task: Task) {
  const dueDate = new Date(task.due_date);
  const timeUntilDue = Math.round((dueDate.getTime() - new Date().getTime()) / (1000 * 60));
  
  let entityName = 'Desconocido';
  
  // Obtener el nombre de la entidad relacionada
  if (task.related_to_type === 'contact' && task.related_to_id) {
    const supabase = createClient();
    const { data: contact } = await supabase
      .from('contacts')
      .select('full_name')
      .eq('id', task.related_to_id)
      .single();
    entityName = contact?.full_name || 'Contacto desconocido';
  } else if (task.related_to_type === 'lead' && task.related_to_id) {
    const supabase = createClient();
    const { data: lead } = await supabase
      .from('leads')
      .select('full_name')
      .eq('id', task.related_to_id)
      .single();
    entityName = lead?.full_name || 'Lead desconocido';
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

  const notificationTitle = `⏰ Tarea próxima a vencer`;
  const notificationBody = `"${task.title}" para ${entityName} vence en ${timeUntilDue} minutos (${formatTime(dueDate)})`;

  // Show browser notification
  showBrowserNotification(notificationTitle, {
    body: notificationBody,
    tag: `task-${task.id}`,
    requireInteraction: true,
    data: { taskId: task.id, entityName, dueDate: task.due_date }
  });

  // Show toast notification as backup
  toast.warning(
    notificationTitle,
    {
      description: notificationBody,
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
    
    for (const task of upcomingTasks) {
      const notificationKey = `${task.id}-${new Date(task.due_date).getHours()}`;
      
      // Only notify if we haven't already notified for this task in this hour
      if (!notifiedTasks.has(notificationKey)) {
        await showTaskDeadlineNotification(task);
        notifiedTasks.add(notificationKey);
        
        // Clean up old notifications after 2 hours
        setTimeout(() => {
          notifiedTasks.delete(notificationKey);
        }, 2 * 60 * 60 * 1000);
      }
    }
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
      (payload) => {
        console.log('Task update received:', payload);
        
        // Show immediate notification for new tasks
        if (payload.eventType === 'INSERT') {
          const task = payload.new as Task;
          
          // Show immediate notification for new task
          showBrowserNotification('📋 Nueva tarea asignada', {
            body: `Se te ha asignado: "${task.title}"`,
            tag: `new-task-${task.id}`,
            requireInteraction: false
          });
          
          toast.info('📋 Nueva tarea asignada', {
            description: `"${task.title}"`,
            duration: 8000
          });
        }
        
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function showNewTaskNotification(task: Task) {
  showBrowserNotification('📋 Nueva tarea asignada', {
    body: `"${task.title}" - Vence: ${new Date(task.due_date).toLocaleDateString('es-ES')}`,
    tag: `new-task-${task.id}`,
    requireInteraction: false
  });
  
  toast.info('📋 Nueva tarea asignada', {
    description: `"${task.title}" - Vence: ${new Date(task.due_date).toLocaleDateString('es-ES')}`,
    duration: 8000
  });
} 