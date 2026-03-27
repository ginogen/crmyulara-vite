import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, RefreshCw, CheckCircle } from 'lucide-react';

interface QRScanDialogProps {
  numberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QRScanDialog({ numberId, open, onOpenChange, onSuccess }: QRScanDialogProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (open && numberId) {
      setConnected(false);
      setQrCode(null);
      fetchQR();
      startPolling();
    }
    return () => stopPolling();
  }, [open, numberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQR = async () => {
    setLoading(true);
    try {
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('session_id')
        .eq('id', numberId)
        .single();

      if (!numberData?.session_id) {
        toast.error('No se encontró el session_id');
        return;
      }

      const { data, error } = await supabase.functions.invoke('wasender-connect-session', {
        body: { session_id: numberData.session_id },
      });

      if (error) throw error;

      const qrCodeString = data?.data?.data?.qrCode;
      if (qrCodeString) {
        const qrDataUrl = await QRCode.toDataURL(qrCodeString, { width: 400, margin: 2 });
        setQrCode(qrDataUrl);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No se recibió código QR');
      }
    } catch (error: any) {
      console.error('Error fetching QR:', error);
      toast.error(error.message || 'Error al obtener código QR');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!numberId) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wasender-get-status`);
      url.searchParams.set('whatsapp_number_id', numberId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      const data = await response.json();
      if (response.ok && data?.data?.data?.status?.toUpperCase() === 'CONNECTED') {
        setConnected(true);
        stopPolling();
        toast.success('¡WhatsApp conectado exitosamente!');
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const startPolling = () => {
    pollingRef.current = setInterval(checkStatus, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escanea este código QR desde tu WhatsApp para vincular el número
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generando código QR...</p>
            </div>
          ) : connected ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <CheckCircle className="w-20 h-20 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">¡Conectado exitosamente!</p>
                <p className="text-sm text-muted-foreground">Tu número está listo para usar</p>
              </div>
            </div>
          ) : qrCode ? (
            <>
              <div className="bg-white p-6 rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg text-sm">
                <ol className="space-y-2 text-blue-800 dark:text-blue-200">
                  <li>1. Abre WhatsApp en tu teléfono</li>
                  <li>2. Ve a <strong>Configuración → Dispositivos vinculados</strong></li>
                  <li>3. Toca <strong>"Vincular un dispositivo"</strong></li>
                  <li>4. Apunta la cámara hacia este código QR</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No se pudo generar el código QR</p>
              <Button onClick={fetchQR}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={fetchQR} disabled={loading || connected}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Nuevo QR
          </Button>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
