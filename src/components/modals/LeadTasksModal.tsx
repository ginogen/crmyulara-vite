import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils/dates';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id: string;
  created_at: string;
  lead_id: string;
  title: string;
  description: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  completed_at: string | null;
  assigned_to: string | null;
  assigned_user?: {
    id: string;
    full_name: string;
  };
}

interface LeadTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
}

export function LeadTasksModal({ isOpen, onClose, leadId }: LeadTasksModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
  });
  const { user, currentOrganization, currentBranch } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && leadId) {
      fetchTasks();
    }
  }, [isOpen, leadId]);

  const fetchTasks = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:users(id, full_name)
        `)
        .eq('related_to_id', leadId)
        .eq('related_to_type', 'lead')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error al obtener tareas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTask.title || !newTask.due_date) {
      console.error('Título y fecha límite son requeridos');
      return;
    }

    if (!user?.id || !currentOrganization?.id || !currentBranch?.id) {
      console.error('Usuario no autenticado o faltan datos de organización');
      return;
    }
    
    try {
      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        due_date: newTask.due_date,
        status: 'pending',
        priority: 'medium',
        related_to_type: 'lead',
        related_to_id: leadId,
        assigned_to: user.id,
        organization_id: currentOrganization.id,
        branch_id: currentBranch.id,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select(`
          *,
          assigned_user:users(id, full_name)
        `)
        .single();
      
      if (error) {
        console.error('Error al agregar tarea:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No se recibió datos de la tarea creada');
      }
      
      setTasks((prev) => [...prev, data]);
      
      setNewTask({
        title: '',
        description: '',
        due_date: '',
      });

      // Registrar en el historial del lead
      await supabase.from('lead_history').insert({
        lead_id: leadId,
        user_id: user.id,
        action: 'task_created',
        description: `Nueva tarea creada: "${newTask.title}"`,
      });
    } catch (error) {
      console.error('Error al agregar tarea:', error);
      // Aquí podrías agregar una notificación de error al usuario
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
    
    try {
      // Obtener información de la tarea para el historial
      const task = tasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: completedAt
        })
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks((prev) => 
        prev.map((task) => 
          task.id === taskId 
            ? { ...task, status: newStatus as any, completed_at: completedAt } 
            : task
        )
      );

      // Registrar en el historial del lead
      if (user?.id && task) {
        await supabase.from('lead_history').insert({
          lead_id: leadId,
          user_id: user.id,
          action: 'task_status_changed',
          description: `Tarea "${task.title}" marcada como ${newStatus === 'completed' ? 'completada' : 'pendiente'}`,
        });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      // Obtener información de la tarea antes de eliminarla
      const task = tasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      // Registrar en el historial del lead
      if (user?.id && task) {
        await supabase.from('lead_history').insert({
          lead_id: leadId,
          user_id: user.id,
          action: 'task_deleted',
          description: `Tarea eliminada: "${task.title}"`,
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full rounded-xl bg-white shadow-2xl transform transition-all">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Tareas del Lead
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {/* Formulario para agregar tarea */}
            <form onSubmit={handleAddTask} className="mb-8 p-6 bg-gray-50 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-base font-medium text-gray-900 mb-4">Nueva tarea</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newTask.title}
                    onChange={(e: any) => setNewTask({ ...newTask, title: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha límite
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="datetime-local"
                      id="due_date"
                      value={newTask.due_date}
                      onChange={(e: any) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="block w-full rounded-lg border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e: any) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Agregar tarea
                  </button>
                </div>
              </div>
            </form>
            
            {/* Lista de tareas */}
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
                  <CalendarIcon className="w-full h-full" />
                </div>
                <p className="text-gray-500 text-sm">
                  No hay tareas para este lead. Añade una tarea para comenzar.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {tasks.map((task) => {
                  const isPastDue = new Date(task.due_date) < new Date() && task.status !== 'completed';
                  
                  return (
                    <li 
                      key={task.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        task.status === 'completed' 
                          ? 'bg-gray-50 border-gray-100' 
                          : isPastDue 
                            ? 'bg-red-50 border-red-100' 
                            : 'bg-white border-gray-100 hover:border-blue-100 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <button
                          onClick={() => handleToggleStatus(task.id, task.status)}
                          className={`flex-shrink-0 mt-1 ${
                            task.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'
                          }`}
                        >
                          <CheckCircleIcon className="h-6 w-6" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={`text-sm font-medium ${
                                task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
                              }`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center space-x-4 text-xs">
                            <div className="flex items-center text-gray-500">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              <span className={isPastDue ? 'text-red-500 font-medium' : ''}>
                                {formatDateTime(task.due_date)}
                              </span>
                            </div>
                            {task.status === 'completed' && task.completed_at && (
                              <div className="flex items-center text-green-500">
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                <span>Completada: {formatDateTime(task.completed_at)}</span>
                              </div>
                            )}
                            {isPastDue && (
                              <div className="flex items-center text-red-500">
                                <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                                <span>Vencida</span>
                              </div>
                            )}
                          </div>
                          {task.assigned_user && (
                            <div className="mt-2 text-xs text-gray-500">
                              Asignado a: {task.assigned_user.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 