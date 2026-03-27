import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ContactInfoPanelProps {
  conversationId: string;
}

export function ContactInfoPanel({ conversationId }: ContactInfoPanelProps) {
  const [conversation, setConversation] = useState<any>(null);
  const navigate = useNavigate();
  const supabase = createClient();

  useEffect(() => {
    if (!conversationId) return;
    supabase
      .from('wa_conversations')
      .select(`
        *,
        contact:contacts(id, full_name, phone, email, city, province, tag)
      `)
      .eq('id', conversationId)
      .single()
      .then(({ data }: { data: any }) => setConversation(data));
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const contact = conversation?.contact;

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
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Sin contacto vinculado</p>
        </div>
      )}
    </div>
  );
}
