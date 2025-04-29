import { Modal } from '../ui/Modal';
import { BudgetForm } from '../forms/BudgetForm';

interface Budget {
  id?: string;
  contact_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

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