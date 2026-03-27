import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WhatsAppNumberDialog } from '@/components/whatsapp/WhatsAppNumberDialog';
import { QRScanDialog } from '@/components/whatsapp/QRScanDialog';
import { Plus, Phone, CheckCircle2, XCircle, QrCode, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function WhatsAppNumbersPage() {
  const { currentOrganization } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [numberToDelete, setNumberToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: numbers = [], refetch } = useQuery({
    queryKey: ['whatsapp_numbers', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id,
  });

  const handleCheckStatus = async (number: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingStatus(number.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Sesión expirada');
        return;
      }

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wasender-get-status`);
      url.searchParams.set('whatsapp_number_id', number.id);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      const data = await response.json();
      if (response.ok) {
        await refetch();
        const status = data?.data?.data?.status?.toUpperCase();
        if (status === 'CONNECTED') {
          toast.success('El número está conectado');
        } else {
          toast.warning(`Estado: ${status || 'Desconocido'}`);
        }
      } else {
        toast.error('Error al verificar estado');
      }
    } catch {
      toast.error('Error al verificar estado');
    } finally {
      setCheckingStatus(null);
    }
  };

  const confirmDelete = async () => {
    if (!numberToDelete) return;
    setDeleting(true);
    try {
      const { data: deleteResponse, error: deleteError } = await supabase.functions.invoke(
        'wasender-delete-session',
        { body: { whatsapp_number_id: numberToDelete.id } }
      );

      if (deleteError) {
        toast.error('Error al comunicarse con Wasender');
      } else if (deleteResponse?.code === 404) {
        toast.warning('La sesión ya no existe en Wasender');
      } else if (deleteResponse?.skipped) {
        toast.info('No había sesión activa');
      } else if (deleteResponse?.success) {
        toast.success('Sesión eliminada de Wasender');
      }

      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', numberToDelete.id);

      if (error) throw error;

      await refetch();
      toast.success('Número eliminado');
      setDeleteDialogOpen(false);
      setNumberToDelete(null);
    } catch (error: any) {
      toast.error('Error al eliminar el número');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Números de WhatsApp</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona los números conectados via Wasender
          </p>
        </div>
        <Button onClick={() => { setSelectedNumber(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Conectar Número
        </Button>
      </div>

      {numbers.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-semibold mb-2">No hay números conectados</h3>
            <p className="text-muted-foreground mb-6 text-sm max-w-md mx-auto">
              Conecta tu primer número de WhatsApp para gestionar conversaciones desde esta plataforma.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Conectar número
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {numbers.map((number: any) => (
            <Card
              key={number.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setSelectedNumber(number); setIsDialogOpen(true); }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="truncate">{number.display_name}</span>
                  </div>
                  {number.is_connected ? (
                    <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-mono text-muted-foreground">{number.phone_number}</p>
                {number.last_connected_at && (
                  <p className="text-xs text-muted-foreground">
                    Conectado: {format(new Date(number.last_connected_at), 'PPp', { locale: es })}
                  </p>
                )}
                <div className="flex flex-col gap-2 pt-1">
                  {!number.is_connected && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNumber(number);
                        setIsQRDialogOpen(true);
                      }}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Ver código QR
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={(e) => handleCheckStatus(number, e)}
                    disabled={checkingStatus === number.id}
                  >
                    {checkingStatus === number.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-2" />Verificar estado</>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNumberToDelete(number);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WhatsAppNumberDialog
        number={selectedNumber}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={refetch}
      />

      {selectedNumber && (
        <QRScanDialog
          numberId={selectedNumber.id}
          open={isQRDialogOpen}
          onOpenChange={setIsQRDialogOpen}
          onSuccess={refetch}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar número de WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará <strong>{numberToDelete?.display_name}</strong> y su sesión de Wasender.
              Las conversaciones no se eliminarán. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
