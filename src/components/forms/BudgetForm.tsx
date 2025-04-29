import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/Select';

interface BudgetFormData {
  contact_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface BudgetFormProps {
  initialData?: BudgetFormData;
  onSubmit: (data: BudgetFormData) => Promise<void>;
  onCancel: () => void;
}

export function BudgetForm({ initialData, onSubmit, onCancel }: BudgetFormProps) {
  const [formData, setFormData] = useState<BudgetFormData>(
    initialData || {
      contact_id: '',
      amount: 0,
      status: 'pending',
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact_id" className="block text-sm font-medium text-gray-700">
          ID del Contacto
        </label>
        <Input
          id="contact_id"
          value={formData.contact_id}
          onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Monto
        </label>
        <Input
          id="amount"
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
          required
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Estado
        </label>
        <Select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as BudgetFormData['status'] })}
          options={statusOptions}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
} 