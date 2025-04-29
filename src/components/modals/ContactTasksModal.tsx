"use client"

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/dates';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ContactTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: 'pending' | 'completed';
  created_at: string;
  assigned_to: string;
  user: {
    full_name: string;
  };
}

export function ContactTasksModal({ isOpen, onClose, contactId }: ContactTasksModalProps) {
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
    const fetchTasks = async () => {
      if (!contactId) return;

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            user:users(full_name)
          `)
          .eq('related_to_type', 'contact')
          .eq('related_to_id', contactId)
          .order('due_date', { ascending: true });

        if (error) throw error;
        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error("Error al cargar las tareas");
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchTasks();
    }
  }, [contactId, isOpen]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !contactId || !currentOrganization?.id || !currentBranch?.id) {
      toast.error("No se puede crear la tarea porque faltan datos requeridos");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            ...newTask,
            related_to_type: 'contact',
            related_to_id: contactId,
            assigned_to: user.id,
            status: 'pending',
            priority: 'medium',
            organization_id: currentOrganization.id,
            branch_id: currentBranch.id,
          },
        ])
        .select(`
          *,
          user:users(full_name)
        `)
        .single();

      if (error) throw error;

      setTasks([...tasks, data]);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
      });

      toast.success("Tarea creada exitosamente");

    } catch (error) {
      console.error('Error creating task:', error);
      toast.error("Error al crear la tarea");
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: Task['status']) => {
    if (!user?.id) return;

    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      toast.success(`Tarea marcada como ${newStatus === 'completed' ? 'completada' : 'pendiente'}`);

    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error("Error al actualizar el estado de la tarea");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Tareas del Contacto</DialogTitle>
          <DialogDescription>
            Gestiona las tareas asociadas a este contacto
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Título de la tarea"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Fecha límite</Label>
                  <Input
                    type="datetime-local"
                    id="due_date"
                    required
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Descripción de la tarea"
                />
              </div>
              <Button type="submit" className="w-full">
                Crear Tarea
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator className="my-4" />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Fecha límite</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="flex justify-center items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Cargando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  No hay tareas disponibles
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Badge
                      variant={task.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {task.status === 'completed' ? 'Completada' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{formatDate(task.due_date)}</TableCell>
                  <TableCell>{task.user?.full_name}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleTaskStatus(task.id, task.status)}
                    >
                      {task.status === 'completed' ? 'Marcar como pendiente' : 'Marcar como completada'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
} 