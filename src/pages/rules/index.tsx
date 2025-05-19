import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Rule } from '@/types/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RuleModal } from '@/components/modals/RuleModal';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function RulesPage() {
  const { currentOrganization, userRole } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | undefined>();
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Verificar si el usuario tiene acceso
  if (!['super_admin', 'org_admin'].includes(userRole || '')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No tienes permiso para acceder a esta página.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchRules();
    fetchAgents();
  }, [currentOrganization?.id]);

  const fetchRules = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error al obtener las reglas:', error);
      toast.error('Error al cargar las reglas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error al obtener los agentes:', error);
    }
  };

  const handleCreateRule = async (ruleData: Partial<Rule>) => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('rules')
        .insert([{
          ...ruleData,
          organization_id: currentOrganization.id,
        }])
        .select()
        .single();

      if (error) throw error;

      setRules(prev => [data, ...prev]);
      toast.success('Regla creada exitosamente');
    } catch (error) {
      console.error('Error al crear la regla:', error);
      toast.error('Error al crear la regla');
    }
  };

  const handleUpdateRule = async (ruleData: Partial<Rule>) => {
    if (!selectedRule?.id) return;

    try {
      const { error } = await supabase
        .from('rules')
        .update(ruleData)
        .eq('id', selectedRule.id);

      if (error) throw error;

      setRules(prev => prev.map(rule => 
        rule.id === selectedRule.id ? { ...rule, ...ruleData } : rule
      ));
      toast.success('Regla actualizada exitosamente');
    } catch (error) {
      console.error('Error al actualizar la regla:', error);
      toast.error('Error al actualizar la regla');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta regla?')) return;

    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      toast.success('Regla eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar la regla:', error);
      toast.error('Error al eliminar la regla');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reglas de Asignación</h1>
          <Button onClick={() => {
            setSelectedRule(undefined);
            setIsModalOpen(true);
          }}>
            Nueva Regla
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No hay reglas configuradas.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condición
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuarios Asignados
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.type === 'campaign' ? 'Por Campaña' : 'Por Provincia'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.condition}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {rule.assigned_users.map(userId => {
                          const agent = agents.find(a => a.id === userId);
                          return agent ? (
                            <Badge key={userId} variant="secondary" className="text-xs">
                              {agent.full_name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={rule.is_active ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {rule.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        onClick={() => {
                          setSelectedRule(rule);
                          setIsModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RuleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRule(undefined);
        }}
        onSubmit={selectedRule ? handleUpdateRule : handleCreateRule}
        rule={selectedRule}
        agents={agents}
      />
    </div>
  );
} 