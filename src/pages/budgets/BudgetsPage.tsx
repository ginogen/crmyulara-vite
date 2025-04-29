import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { Modal } from '@/components/ui/Modal';
import { useBudgets } from '@/hooks/useBudgets';
import type { Budget } from '@/types';

export function BudgetsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { budgets, isLoading, createBudget } = useBudgets();

  const handleSubmit = async (data: Partial<Budget>) => {
    try {
      await createBudget.mutateAsync(data);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error al crear presupuesto:', error);
    }
  };

  if (isLoading) {
    return <div>Cargando presupuestos...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Presupuestos</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          Nuevo Presupuesto
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {budgets.map((budget) => (
              <tr key={budget.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {budget.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ${budget.amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {budget.status}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(budget.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Presupuesto"
      >
        <BudgetForm 
          onSubmit={handleSubmit} 
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
} 