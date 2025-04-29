import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLeads } from '@/hooks/useLeads';
import { useContacts } from '@/hooks/useContacts';
import { useBudgets } from '@/hooks/useBudgets';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils/dates';

export default function DashboardPage() {
  const { currentOrganization, currentBranch } = useAuth();
  const { leads, loading: leadsLoading } = useLeads(currentOrganization?.id, currentBranch?.id);
  const { contacts, isLoading: contactsLoading } = useContacts(currentOrganization?.id, currentBranch?.id);
  const { budgets, isLoading: budgetsLoading } = useBudgets(currentOrganization?.id, currentBranch?.id);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    leadsWithoutManagement: 0,
    interested: 0,
    contacted: 0
  });
  const [pendingTasks, setPendingTasks] = useState<Array<{
    id: string;
    title: string;
    description: string;
    due_date: string;
    related_to_type: string;
    related_to_id: string;
    related_name: string;
    related_info: string;
  }>>([]);
  const supabase = createClient();

  // Si no hay organización o sucursal seleccionada, mostrar mensaje
  if (!currentOrganization || !currentBranch) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Seleccione una organización y sucursal</h2>
        <p className="text-gray-500">Para ver el dashboard, es necesario seleccionar una organización y sucursal.</p>
      </div>
    );
  }

  useEffect(() => {
    async function fetchStats() {
      try {
        if (!currentOrganization?.id || !currentBranch?.id) {
          setStats({
            totalLeads: 0,
            leadsWithoutManagement: 0,
            interested: 0,
            contacted: 0
          });
          setLoading(false);
          return;
        }
        
        const [
          { count: totalLeadsCount },
          { count: leadsWithoutManagementCount },
          { count: interestedCount },
          { count: contactedCount }
        ] = await Promise.all([
          supabase.from('leads').select('*', { count: 'exact' })
            .eq('organization_id', currentOrganization.id)
            .eq('branch_id', currentBranch.id),
          supabase.from('leads').select('*', { count: 'exact' })
            .eq('status', 'new')
            .eq('organization_id', currentOrganization.id)
            .eq('branch_id', currentBranch.id),
          supabase.from('leads').select('*', { count: 'exact' })
            .eq('status', 'interested')
            .eq('organization_id', currentOrganization.id)
            .eq('branch_id', currentBranch.id),
          supabase.from('leads').select('*', { count: 'exact' })
            .eq('status', 'contacted')
            .eq('organization_id', currentOrganization.id)
            .eq('branch_id', currentBranch.id)
        ]);

        setStats({
          totalLeads: totalLeadsCount || 0,
          leadsWithoutManagement: leadsWithoutManagementCount || 0,
          interested: interestedCount || 0,
          contacted: contactedCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [supabase, currentOrganization?.id, currentBranch?.id]);

  useEffect(() => {
    const fetchPendingTasks = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        // Obtenemos todas las tareas pendientes
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true });

        if (error) throw error;

        // Obtenemos los leads relacionados
        const leadIds = tasks
          .filter((task: { related_to_type: string; related_to_id: string }) => task.related_to_type === 'lead')
          .map((task: { related_to_id: string }) => task.related_to_id);

        const { data: leads } = await supabase
          .from('leads')
          .select('id, full_name, inquiry_number')
          .in('id', leadIds);

        // Obtenemos los contactos relacionados
        const contactIds = tasks
          .filter((task: { related_to_type: string; related_to_id: string }) => task.related_to_type === 'contact')
          .map((task: { related_to_id: string }) => task.related_to_id);

        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, full_name, phone')
          .in('id', contactIds);

        // Combinamos la información
        const allTasks = tasks.map((task) => {
          if (task.related_to_type === 'lead') {
            const lead = leads?.find((l) => l.id === task.related_to_id);
            return {
              id: task.id,
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              related_to_type: task.related_to_type,
              related_to_id: task.related_to_id,
              related_name: lead?.full_name || 'Lead sin nombre',
              related_info: lead?.inquiry_number || ''
            };
          } else {
            const contact = contacts?.find((c) => c.id === task.related_to_id);
            return {
              id: task.id,
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              related_to_type: task.related_to_type,
              related_to_id: task.related_to_id,
              related_name: contact?.full_name || 'Contacto sin nombre',
              related_info: contact?.phone || ''
            };
          }
        });

        setPendingTasks(allTasks);
      } catch (error) {
        console.error('Error al obtener tareas pendientes:', error);
      }
    };

    fetchPendingTasks();
  }, [currentOrganization?.id]);

  if (loading || leadsLoading || contactsLoading || budgetsLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          <span className="text-lg text-gray-700">Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const newLeadsCount = leads.filter(lead => lead.status === 'new').length;
  const contactedLeadsCount = leads.filter(lead => lead.status === 'contacted').length;

  const distributionData = [
    { name: 'Nuevos', value: newLeadsCount },
    { name: 'Contactados', value: contactedLeadsCount }
  ];

  const pieData = [];
  const totalLeadsForPie = newLeadsCount + contactedLeadsCount;
  
  if (totalLeadsForPie > 0) {
    pieData.push(
      { name: 'Nuevos', value: (newLeadsCount / totalLeadsForPie) * 100 },
      { name: 'Contactados', value: (contactedLeadsCount / totalLeadsForPie) * 100 }
    );
  } else {
    // Si no hay datos, poner un placeholder
    pieData.push({ name: 'Sin datos', value: 100 });
  }

  const COLORS = ['#8884d8', '#00C49F'];

  // Filter recent leads and contacts
  const recentLeads = leads
    .filter(lead => lead.status === 'new')
    .slice(0, 3);
  
  const recentContacts = contacts
    .slice(0, 2);

  return (
    <div className="p-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-start">
            <div className="bg-gray-700 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium mt-2">Leads Totales</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">{stats.totalLeads}</span>
            <span className="ml-2 text-sm text-green-500">+100%</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-100 h-1">
              <div className="bg-green-500 h-1 w-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-start">
            <div className="bg-gray-700 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium mt-2">Leads Sin Gestión</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">{stats.leadsWithoutManagement}</span>
            <span className="ml-2 text-sm text-green-500">0%</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-100 h-1">
              <div className="bg-green-500 h-1 w-1/2"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-start">
            <div className="bg-gray-700 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium mt-2">Interesados</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">{stats.interested}</span>
            <span className="ml-2 text-sm text-green-500">0%</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-100 h-1">
              <div className="bg-green-500 h-1 w-3/4"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-start">
            <div className="bg-gray-700 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium mt-2">Contactados</h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">{stats.contacted}</span>
            <span className="ml-2 text-sm text-green-500">+2%</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-100 h-1">
              <div className="bg-green-500 h-1 w-4/5"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tareas Pendientes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tareas Pendientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Límite
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Relacionado con
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Información
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    No hay tareas pendientes
                  </td>
                </tr>
              ) : (
                pendingTasks.map((task) => {
                  const isOverdue = new Date(task.due_date) < new Date();
                  
                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {task.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOverdue 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {formatDate(task.due_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {task.related_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {task.related_info}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.related_to_type === 'lead' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {task.related_to_type === 'lead' ? 'Lead' : 'Contacto'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Distribución de Leads por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={distributionData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Proporción de Leads</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Leads, Contacts and Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Leads Recientes</h3>
            <button className="text-gray-600 px-3 py-1 rounded border border-gray-300">Ver Todos</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-2">NOMBRE</th>
                <th className="pb-2">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead) => (
                <tr key={lead.id}>
                  <td className="py-2">{lead.full_name}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      new
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Contactos Recientes</h3>
            <button className="text-gray-600 px-3 py-1 rounded border border-gray-300">Ver Todos</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-2">NOMBRE</th>
                <th className="pb-2">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {recentContacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="py-2">{contact.full_name}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      contacted
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Presupuestos Recientes</h3>
            <button className="text-gray-600 px-3 py-1 rounded border border-gray-300">Ver Todos</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-2">TÍTULO</th>
                <th className="pb-2">CLIENTE</th>
                <th className="pb-2">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length > 0 ? (
                budgets.slice(0, 3).map((budget) => (
                  <tr key={budget.id}>
                    <td className="py-2">{budget.title}</td>
                    <td className="py-2">${budget.amount.toLocaleString()}</td>
                    <td className="py-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        {budget.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    No hay presupuestos disponibles
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 