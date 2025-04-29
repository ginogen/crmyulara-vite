import { Modal } from '../ui/Modal';
import { BudgetForm } from '../forms/BudgetForm';
import type { Database } from '@/lib/supabase/database.types';

type Budget = Database['public']['Tables']['budgets']['Row'];

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget;
  onSubmit: (data: Omit<Budget, 'id' | 'created_at'>) => Promise<void>;
}

export default function BudgetModal({
  isOpen,
  onClose,
  budget,
  onSubmit,
}: BudgetModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={budget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
    >
      <BudgetForm 
        initialData={budget} 
        onSubmit={onSubmit} 
        onCancel={onClose}
      />
    </Modal>
  );
} 