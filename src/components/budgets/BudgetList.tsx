import { useState } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { Button } from '@/components/ui/Button';
import { BudgetForm } from '@/components/forms/BudgetForm';

export function BudgetList() {
  const { budgets, isLoading, error, createBudget, updateBudget, deleteBudget } = useBudgets();
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (isLoading) {
    return <div>Cargando presupuestos...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Presupuestos</h2>
        <Button onClick={() => setIsFormOpen(true)}>Nuevo Presupuesto</Button>
      </div>

      {isFormOpen && (
        <BudgetForm
          onSubmit={async (data) => {
            await createBudget(data);
            setIsFormOpen(false);
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {budgets.map((budget) => (
              <tr key={budget.id}>
                <td className="px-6 py-4 whitespace-nowrap">{budget.contact_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">${budget.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      budget.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : budget.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {budget.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(budget.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Implementar edición
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="ml-2"
                    onClick={() => deleteBudget(budget.id)}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 