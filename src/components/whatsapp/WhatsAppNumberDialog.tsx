import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { QrCode, Phone, Loader2 } from 'lucide-react';

interface WhatsAppNumberDialogProps {
  number?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WhatsAppNumberDialog({ number, open, onOpenChange, onSuccess }: WhatsAppNumberDialogProps) {
  const { currentOrganization, currentBranch } = useAuth();
  const [formData, setFormData] = useState({ phone_number: '', display_name: '' });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (number) {
      setFormData({ phone_number: number.phone_number || '', display_name: number.display_name || '' });
    } else {
      setFormData({ phone_number: '', display_name: '' });
    }
  }, [number, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (number) {
        const { error } = await supabase
          .from('whatsapp_numbers')
          .update({ display_name: formData.display_name })
          .eq('id', number.id);
        if (error) throw error;
        toast.success('Número actualizado');
      } else {
        if (!currentOrganization?.id) {
          toast.error('No hay organización seleccionada');
          return;
        }

        const { data, error } = await supabase.functions.invoke('wasender-create-session', {
          body: {
            name: formData.display_name,
            phone_number: formData.phone_number,
            organization_id: currentOrganization.id,
            branch_id: currentBranch?.id || null,
          },
        });

        if (error) throw error;

        if (data?.error) {
          const errorMsg = data.error;
          if (errorMsg.includes('Personal Access Token')) {
            toast.error('Configura tu Wasender Token primero en Configuración → Perfil');
            return;
          }
          throw new Error(errorMsg);
        }

        toast.success('Sesión creada. Ahora escanea el código QR para conectar.');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar número');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            {number ? 'Editar Número' : 'Conectar Número de WhatsApp'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="display_name">Nombre para mostrar *</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="Ej: Soporte Principal, Ventas..."
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone_number">Número de teléfono *</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="+5491123456789"
              disabled={!!number}
              className="mt-1.5 font-mono"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {number
                ? 'El número no se puede cambiar'
                : 'Incluye el código de país (ej: +54 para Argentina)'}
            </p>
          </div>

          {!number && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg">
              <div className="flex gap-3">
                <QrCode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Próximo paso: Escanear QR</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Después de guardar, escanea el QR desde WhatsApp → Dispositivos Vinculados.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
