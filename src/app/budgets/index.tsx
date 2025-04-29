import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import BudgetList from '../../components/budgets/BudgetList';
import BudgetModal from '../../components/modals/BudgetModal';
import type { Database } from '../../lib/supabase/database.types';

type Budget = Database['public']['Tables']['budgets']['Row'];

export default function BudgetsPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>();

  const handleCreateBudget = () => {
    setSelectedBudget(undefined);
    setIsModalOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsModalOpen(true);
  };

  const handleSubmitBudget = async (data: Omit<Budget, 'id' | 'created_at'>) => {
    // TODO: Implementar la lógica de guardado
    setIsModalOpen(false);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Presupuestos</h1>
        <Button onClick={handleCreateBudget}>Nuevo Presupuesto</Button>
      </div>

      <BudgetList onEdit={handleEditBudget} />

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        budget={selectedBudget}
        onSubmit={handleSubmitBudget}
      />
    </div>
  );
} 