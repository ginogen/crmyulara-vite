import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, ExternalLink, UserPlus, Link, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ContactInfoPanelProps {
  conversationId: string;
}

export function ContactInfoPanel({ conversationId }: ContactInfoPanelProps) {
  const { currentOrganization } = useAuth();
  const [conversation, setConversation] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingContact, setExistingContact] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    city: '',
    province: '',
    tag: '',
  });
  const navigate = useNavigate();
  const supabase = createClient();

  const fetchConversation = async () => {
    const { data } = await supabase
      .from('wa_conversations')
      .select(`
        *,
        contact:contacts(id, full_name, phone, email, city, province, tag)
      `)
      .eq('id', conversationId)
      .single();
    setConversation(data);

    // If no contact linked, check if one exists with this phone
    if (data && !data.contact && data.phone_number && currentOrganization?.id) {
      const { data: found } = await supabase
        .from('contacts')
        .select('id, full_name, phone')
        .eq('phone', data.phone_number)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();
      setExistingContact(found);
    } else {
      setExistingContact(null);
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    setShowForm(false);
    fetchConversation();
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const contact = conversation?.contact;

  const openSaveForm = () => {
    setFormData({
      full_name: conversation?.push_name || '',
      phone: conversation?.phone_number || '',
      email: '',
      city: '',
      province: '',
      tag: '',
    });
    setShowForm(true);
  };

  const linkExistingContact = async () => {
    if (!existingContact) return;
    setSaving(true);
    const { error } = await supabase
      .from('wa_conversations')
      .update({ contact_id: existingContact.id })
      .eq('id', conversationId);

    if (error) {
      toast.error('Error al vincular contacto');
    } else {
      toast.success('Contacto vinculado');
      await fetchConversation();
    }
    setSaving(false);
  };

  const saveNewContact = async () => {
    if (!formData.full_name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!currentOrganization?.id) return;

    setSaving(true);
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        city: formData.city.trim() || null,
        province: formData.province.trim() || null,
        tag: formData.tag.trim() || null,
        organization_id: currentOrganization.id,
        branch_id: conversation?.branch_id || null,
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Error al crear contacto');
      setSaving(false);
      return;
    }

    // Link contact to conversation
    await supabase
      .from('wa_conversations')
      .update({ contact_id: newContact.id })
      .eq('id', conversationId);

    toast.success('Contacto guardado y vinculado');
    setShowForm(false);
    await fetchConversation();
    setSaving(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Info del contacto
      </h3>

      {contact ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{contact.full_name || 'Sin nombre'}</p>
              {contact.tag && (
                <Badge variant="outline" className="text-xs mt-0.5">{contact.tag}</Badge>
              )}
            </div>
          </div>

          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{contact.phone}</span>
            </div>
          )}

          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}

          {(contact.city || contact.province) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{[contact.city, contact.province].filter(Boolean).join(', ')}</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => navigate(`/contacts`)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver en Contactos
          </Button>
        </div>
      ) : showForm ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Nombre *</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nombre completo"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Telefono</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+54..."
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Email</Label>
            <Input
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@ejemplo.com"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ciudad</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Provincia</Label>
            <Input
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Etiqueta</Label>
            <Input
              value={formData.tag}
              onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              placeholder="ej: cliente, proveedor"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={saveNewContact}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-center py-2">
            <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">
              {conversation?.push_name || conversation?.phone_number || 'Desconocido'}
            </p>
            {conversation?.phone_number && conversation?.push_name && (
              <p className="text-xs text-muted-foreground">{conversation.phone_number}</p>
            )}
          </div>

          {existingContact ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={linkExistingContact}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
              Vincular a {existingContact.full_name}
            </Button>
          ) : null}

          <Button
            size="sm"
            className="w-full"
            onClick={openSaveForm}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Guardar como contacto
          </Button>
        </div>
      )}
    </div>
  );
}
