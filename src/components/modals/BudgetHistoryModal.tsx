import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useBudgetHistory } from '@/hooks/useBudgetHistory';
import { ClockIcon, UserIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface BudgetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetId: string;
  budgetTitle: string;
}

const ACTION_LABELS = {
  created: 'Creado',
  updated: 'Actualizado', 
  status_changed: 'Estado cambiado',
  restored: 'Restaurado'
};

const ACTION_COLORS = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  status_changed: 'bg-yellow-100 text-yellow-800',
  restored: 'bg-purple-100 text-purple-800'
};

export function BudgetHistoryModal({ isOpen, onClose, budgetId, budgetTitle }: BudgetHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  
  const { 
    history, 
    isLoading, 
    error, 
    restoreVersion, 
    isRestoring,
    formatDate,
    shouldShowUser
  } = useBudgetHistory(budgetId);

  const handleRestore = async (historyEntry: any) => {
    try {
      await restoreVersion(historyEntry);
      setShowConfirmRestore(false);
      setSelectedVersion(null);
      onClose();
    } catch (error) {
      console.error('Error restoring version:', error);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      not_sent: 'No enviado',
      sent: 'Enviado',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const renderChangesSummary = (changesSummary: any) => {
    if (!changesSummary) return null;
    
    const changes = Object.entries(changesSummary)
      .filter(([_, changed]) => changed)
      .map(([field, _]) => {
        const fieldLabels = {
          title_changed: 'Título',
          description_changed: 'Descripción', 
          amount_changed: 'Monto',
          status_changed: 'Estado',
          contact_changed: 'Contacto',
          lead_changed: 'Lead'
        };
        return fieldLabels[field as keyof typeof fieldLabels] || field;
      });

    if (changes.length === 0) return null;

    return (
      <div className="text-sm text-gray-600 mt-1">
        Cambios: {changes.join(', ')}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando historial...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error al cargar historial</DialogTitle>
          </DialogHeader>
          <div className="text-red-600 p-4">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Historial: {budgetTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No hay historial disponible para este presupuesto.
            </div>
          ) : (
            history.map((entry, index) => (
              <Card key={entry.id} className={`${index === 0 ? 'border-blue-200 bg-blue-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary" 
                        className={ACTION_COLORS[entry.action as keyof typeof ACTION_COLORS]}
                      >
                        Versión {entry.version_number}
                      </Badge>
                      <Badge variant="outline">
                        {ACTION_LABELS[entry.action as keyof typeof ACTION_LABELS]}
                      </Badge>
                      {index === 0 && (
                        <Badge className="bg-green-100 text-green-800">
                          Actual
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {shouldShowUser() && entry.created_by_user && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <UserIcon className="w-4 h-4" />
                          {entry.created_by_user.full_name}
                        </div>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatDate(entry.created_at)}
                      </span>
                      {index > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(entry.id);
                            setShowConfirmRestore(true);
                          }}
                          disabled={isRestoring}
                          className="h-8 px-3"
                        >
                          <ArrowPathIcon className="w-4 h-4 mr-1" />
                          Restaurar
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {renderChangesSummary(entry.changes_summary)}
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Título:</span>
                      <p className="text-gray-900 mt-1">{entry.title}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Monto:</span>
                      <p className="text-gray-900 mt-1 font-semibold">{formatAmount(entry.amount)}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Estado:</span>
                      <p className="text-gray-900 mt-1">{getStatusLabel(entry.status)}</p>
                    </div>
                  </div>

                  {entry.description && (
                    <div className="mt-4">
                      <span className="font-medium text-gray-700">Descripción:</span>
                      <div 
                        className="mt-2 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: entry.description }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal de confirmación para restaurar */}
        {showConfirmRestore && selectedVersion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirmar Restauración</h3>
              <p className="text-gray-600 mb-6">
                ¿Está seguro de que desea restaurar el presupuesto a esta versión anterior? 
                Esta acción creará una nueva versión con los datos seleccionados.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmRestore(false);
                    setSelectedVersion(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const entryToRestore = history.find(h => h.id === selectedVersion);
                    if (entryToRestore) {
                      handleRestore(entryToRestore);
                    }
                  }}
                  disabled={isRestoring}
                >
                  {isRestoring ? 'Restaurando...' : 'Restaurar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}