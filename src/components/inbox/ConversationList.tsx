import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { currentOrganization } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  const fetchConversations = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('wa_conversations')
      .select(`
        *,
        contact:contacts(id, full_name, phone),
        whatsapp_number:whatsapp_numbers(display_name, phone_number),
        wa_messages(content, created_at, direction, delivery_status, message_type)
      `)
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'open')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);

    if (!error && data) {
      setConversations(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    // Realtime subscription
    if (!currentOrganization?.id) return;

    const channel = supabase
      .channel('wa_conversations_list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wa_conversations',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wa_messages' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = conv.contact?.full_name?.toLowerCase() || '';
    const phone = conv.contact?.phone?.toLowerCase() || '';
    return name.includes(s) || phone.includes(s);
  });

  const getLastMessage = (conv: any) => {
    const msgs = conv.wa_messages;
    if (!msgs || msgs.length === 0) return null;
    return msgs.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Cargando conversaciones...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-8 text-center">
            <MessageCircle className="w-10 h-10 opacity-30" />
            <p className="text-sm">
              {search ? 'Sin resultados' : 'No hay conversaciones abiertas'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const lastMsg = getLastMessage(conv);
            const isSelected = selectedId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`p-3 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                  isSelected ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {(conv.contact?.full_name || conv.contact?.phone || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium truncate">
                        {conv.contact?.full_name || conv.contact?.phone || 'Desconocido'}
                      </span>
                      {lastMsg && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(lastMsg.created_at), {
                            addSuffix: false,
                            locale: es,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {lastMsg && (
                        <p className="text-xs text-muted-foreground truncate">
                          {lastMsg.direction === 'outbound' ? '→ ' : ''}
                          {lastMsg.message_type !== 'text'
                            ? `[${lastMsg.message_type}]`
                            : lastMsg.content || ''}
                        </p>
                      )}
                    </div>
                    {conv.whatsapp_number && (
                      <Badge variant="outline" className="text-xs mt-1 py-0 px-1.5">
                        {conv.whatsapp_number.display_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
