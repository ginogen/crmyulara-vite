import { useState, useEffect } from 'react';
import { Rule, RuleType } from '@/types/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Select from 'react-select';
import { Switch } from "@/components/ui/switch";

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ruleData: Partial<Rule>) => Promise<void>;
  rule?: Rule;
  agents: Array<{ id: string; full_name: string }>;
}

export function RuleModal({ isOpen, onClose, onSubmit, rule, agents }: RuleModalProps) {
  const [formData, setFormData] = useState<Partial<Rule>>({
    type: 'campaign',
    condition: '',
    assigned_users: [],
    is_active: true,
  });

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    }
  }, [rule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error al guardar la regla:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar Regla' : 'Nueva Regla'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Regla</Label>
            <Select
              options={[
                { value: 'campaign', label: 'Por Campaña' },
                { value: 'province', label: 'Por Provincia' }
              ]}
              value={{
                value: formData.type || 'campaign',
                label: formData.type === 'campaign' ? 'Por Campaña' : 'Por Provincia'
              }}
              onChange={(option) => setFormData({ ...formData, type: option?.value as RuleType })}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>
              {formData.type === 'campaign' ? 'Campaña contiene' : 'Provincia es'}
            </Label>
            <Input
              value={formData.condition || ''}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              placeholder={formData.type === 'campaign' ? 'Ej: Facebook' : 'Ej: Buenos Aires'}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Usuarios Asignados</Label>
            <Select
              isMulti
              options={agents.map(agent => ({
                value: agent.id,
                label: agent.full_name
              }))}
              value={formData.assigned_users?.map(userId => ({
                value: userId,
                label: agents.find(a => a.id === userId)?.full_name
              }))}
              onChange={(options) => setFormData({
                ...formData,
                assigned_users: options.map(opt => opt.value)
              })}
              className="text-sm"
            />
            <p className="text-xs text-gray-500">
              Si seleccionas múltiples usuarios, los leads se asignarán aleatoriamente entre ellos.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label>Regla Activa</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {rule ? 'Guardar Cambios' : 'Crear Regla'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 