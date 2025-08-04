"use client"

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Contact } from '@/types/supabase';
import { formatPhoneNumber } from '@/lib/utils/strings';
import { formatDate } from '@/lib/utils/dates';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ContactManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: Contact;
}

interface HistoryEntry {
  id: string;
  lead_id?: string;
  contact_id?: string;
  action: string;
  description: string;
  created_at: string;
  source: 'lead' | 'contact';
  user?: {
    full_name: string;
  };
}

interface Email {
  id: string;
  subject: string;
  body: string;
  from_email: string;
  to_emails: string[];
  status: string;
  direction: string;
  created_at: string;
  sent_at: string | null;
  scheduled_for: string | null;
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

interface WhatsAppMessage {
  id: string;
  message: string;
  created_at: string;
  sent_by: string;
  users: {
    full_name: string;
  };
}

export function ContactManagementModal({ isOpen, onClose, contact }: ContactManagementModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
  });
  const { user, currentOrganization, currentBranch } = useAuth();
  const supabase = createClient();
  const [whatsappHistory, setWhatsappHistory] = useState<WhatsAppMessage[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!contact?.id) return;

      try {
        const allHistory: HistoryEntry[] = [];

        // Obtener historial del lead si existe
        if (contact.original_lead_id) {
          const { data: leadHistory, error: leadError } = await supabase
            .from('lead_history')
            .select(`
              id,
              created_at,
              lead_id,
              user_id,
              action,
              description
            `)
            .eq('lead_id', contact.original_lead_id)
            .order('created_at', { ascending: false });

          if (leadError) throw leadError;
          
          // Transformar historial del lead
          const transformedLeadHistory = (leadHistory || []).map(entry => ({
            ...entry,
            source: 'lead' as const
          }));
          
          allHistory.push(...transformedLeadHistory);
        }

        // Obtener historial del contacto
        const { data: contactHistory, error: contactError } = await supabase
          .from('contact_history')
          .select(`
            id,
            created_at,
            contact_id,
            user_id,
            action,
            description
          `)
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false });

        if (contactError && contactError.code !== '42P01') { // Ignorar si la tabla no existe aún
          throw contactError;
        }

        // Transformar historial del contacto
        const transformedContactHistory = (contactHistory || []).map(entry => ({
          ...entry,
          source: 'contact' as const
        }));
        
        allHistory.push(...transformedContactHistory);

        // Ordenar todo el historial por fecha
        const sortedHistory = allHistory.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Obtener información de usuarios
        const userIds = [...new Set(sortedHistory.map(entry => entry.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          // Combinar información de usuarios con el historial
          const historyWithUsers = sortedHistory.map(entry => ({
            ...entry,
            user: users?.find(user => user.id === entry.user_id) || null
          }));

          setHistory(historyWithUsers);
        } else {
          setHistory(sortedHistory);
        }
      } catch (error) {
        console.error('Error fetching combined history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchEmails = async () => {
      if (!contact?.id) return;

      try {
        const response = await fetch(`/api/contacts/${contact.id}/emails`);
        if (!response.ok) throw new Error('Error fetching emails');
        const data = await response.json();
        setEmails(data || []);
      } catch (error) {
        console.error('Error fetching emails:', error);
      } finally {
        setIsLoadingEmails(false);
      }
    };

    const fetchTasks = async () => {
      if (!contact?.id) return;

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            user:users(full_name)
          `)
          .eq('related_to_type', 'contact')
          .eq('related_to_id', contact.id)
          .order('due_date', { ascending: true });

        if (error) throw error;
        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error("Error al cargar las tareas");
      } finally {
        setIsLoadingTasks(false);
      }
    };

    if (isOpen && contact) {
      fetchHistory();
      fetchEmails();
      fetchTasks();
    }
  }, [contact?.original_lead_id, contact?.id, isOpen]);

  useEffect(() => {
    if (!contact) return;

    const fetchWhatsappHistory = async () => {
      const { data: whatsappData, error: whatsappError } = await supabase
        .from('whatsapp_messages')
        .select(`
          id,
          message,
          created_at,
          sent_by,
          users!inner (
            full_name
          )
        `)
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });

      if (whatsappError) {
        console.error('Error fetching WhatsApp history:', whatsappError);
        return;
      }

      const formattedData = (whatsappData || []).map(msg => ({
        ...msg,
        users: {
          full_name: msg.users[0]?.full_name || 'Usuario desconocido'
        }
      }));

      setWhatsappHistory(formattedData);
    };

    fetchWhatsappHistory();
  }, [contact]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !contact?.id || !currentOrganization?.id || !currentBranch?.id) {
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
            related_to_id: contact.id,
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
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, ...data } : task
      ));

      toast.success(`Tarea marcada como ${newStatus === 'completed' ? 'completada' : 'pendiente'}`);

    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error("Error al actualizar el estado de la tarea");
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">
                {contact?.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{contact?.full_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">{contact?.email}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{formatPhoneNumber(contact?.phone || '')}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-5 gap-4 bg-transparent p-0">
            <TabsTrigger 
              value="info"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Información
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Historial
            </TabsTrigger>
            <TabsTrigger 
              value="emails"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Emails
            </TabsTrigger>
            <TabsTrigger 
              value="tasks"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Tareas
            </TabsTrigger>
            <TabsTrigger 
              value="whatsapp"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-lg">Información del Contacto</CardTitle>
                  <CardDescription>Datos principales del contacto</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Nombre</h4>
                      <p className="text-base font-medium">{contact?.full_name}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                      <p className="text-base font-medium">{contact?.email || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Teléfono</h4>
                      <p className="text-base font-medium">{formatPhoneNumber(contact?.phone || '')}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Etiqueta</h4>
                      <Badge variant="secondary" className="text-sm">
                        {contact?.tag}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Ciudad</h4>
                      <p className="text-base font-medium">{contact?.city}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Provincia</h4>
                      <p className="text-base font-medium">{contact?.province || 'No especificada'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Fecha de Creación</h4>
                    <p className="text-base font-medium">{formatDate(contact?.created_at || '')}</p>
                  </div>
                </CardContent>
              </Card>

              {contact?.original_lead_id && (
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="text-lg">Información del Lead Original</CardTitle>
                    <CardDescription>
                      Consulta #{contact?.original_lead_inquiry_number || 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Origen</h4>
                        <Badge variant="outline" className="text-sm">
                          {contact?.origin || 'No especificado'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Estado Final</h4>
                        <Badge 
                          variant={contact?.original_lead_status === 'converted' ? 'default' : 'outline'} 
                          className="text-sm"
                        >
                          {contact?.original_lead_status || 'No especificado'}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Pasajeros</h4>
                        <p className="text-base font-medium">{contact?.pax_count || 'No especificado'}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Fecha de Viaje</h4>
                        <p className="text-base font-medium">
                          {contact?.estimated_travel_date ? formatDate(contact.estimated_travel_date) : 'No especificada'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Destino de Interés</h4>
                      <p className="text-base font-medium">
                        {contact?.destination_of_interest || 'No especificado'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Presupuesto Estimado</h4>
                      <p className="text-base font-medium">
                        {contact?.estimated_budget ? 
                          new Intl.NumberFormat('es-AR', { 
                            style: 'currency', 
                            currency: 'ARS' 
                          }).format(contact.estimated_budget) 
                          : 'No especificado'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Notas Adicionales</h4>
                      <p className="text-base font-medium whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                        {contact?.additional_notes || 'Sin notas adicionales'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-none shadow-md">
              <CardHeader className="bg-muted/50">
                <CardTitle>Historial de Actividades</CardTitle>
                <CardDescription>
                  Registro de todas las actividades relacionadas con este contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          <div className="flex justify-center items-center space-x-2">
                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Cargando...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          No hay historial disponible
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-muted/50">
                          <TableCell>{formatDate(entry.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Badge 
                                variant={entry.source === 'lead' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {entry.source === 'lead' ? 'Lead' : 'Contacto'}
                              </Badge>
                              <Badge variant="outline">{entry.action}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell>{entry.user?.full_name}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails">
            <Card className="border-none shadow-md">
              <CardHeader className="bg-muted/50">
                <CardTitle>Historial de Emails</CardTitle>
                <CardDescription>
                  Registro de todos los emails enviados y recibidos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Dirección</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingEmails ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          <div className="flex justify-center items-center space-x-2">
                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Cargando...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : emails.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          No hay emails disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      emails.map((email) => (
                        <TableRow key={email.id} className="hover:bg-muted/50">
                          <TableCell>{formatDate(email.created_at)}</TableCell>
                          <TableCell>{email.subject}</TableCell>
                          <TableCell>
                            <Badge
                              variant={email.status === 'sent' ? 'default' : 'outline'}
                            >
                              {email.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{email.direction}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="border-none shadow-md">
              <CardHeader className="bg-muted/50">
                <CardTitle>Tareas</CardTitle>
                <CardDescription>
                  Gestiona las tareas asociadas a este contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateTask} className="space-y-4 mb-6 bg-muted/30 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        required
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Título de la tarea"
                        className="bg-background"
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
                        className="bg-background"
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
                      className="bg-background"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Crear Tarea
                  </Button>
                </form>

                <Separator className="my-6" />

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
                    {isLoadingTasks ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
                          <div className="flex justify-center items-center space-x-2">
                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                        <TableRow key={task.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Badge
                              variant={task.status === 'completed' ? 'default' : 'outline'}
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <Card className="border-none shadow-md">
              <CardHeader className="bg-muted/50">
                <CardTitle>Historial de WhatsApp</CardTitle>
                <CardDescription>
                  Registro de mensajes de WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {whatsappHistory.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No hay mensajes de WhatsApp disponibles
                    </div>
                  ) : (
                    whatsappHistory.map((message) => (
                      <div key={message.id} className="flex gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 448 512"
                              fill="currentColor"
                              className="w-5 h-5 text-primary"
                            >
                              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">{message.users.full_name}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(message.created_at)}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{message.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 