import { Modal } from '../ui/Modal';
import { BudgetForm } from '../forms/BudgetForm';
import type { Database } from '@/lib/supabase/database.types';
import type { Lead } from '@/types/supabase';

type Budget = Database['public']['Tables']['budgets']['Row'];

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget;
  selectedLead?: Lead | null;
  onSubmit: (data: Omit<Budget, 'id' | 'created_at'>) => Promise<void>;
}

export default function BudgetModal({
  isOpen,
  onClose,
  budget,
  selectedLead,
  onSubmit,
}: BudgetModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={budget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
      size="lg"
    >
      <BudgetForm 
        initialData={budget} 
        selectedLead={selectedLead}
        onSubmit={onSubmit} 
        onCancel={onClose}
      />
    </Modal>
  );
} 