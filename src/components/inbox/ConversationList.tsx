import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ALL_NUMBERS = 'all';
const numberStorageKey = (orgId: string) => `inbox:number:${orgId}`;

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { currentOrganization, user, userRole } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();
  const isInboxAdmin = userRole === 'super_admin' || userRole === 'org_admin';
  const orgId = currentOrganization?.id;

  const [selectedNumberId, setSelectedNumberId] = useState<string>(() =>
    orgId ? localStorage.getItem(numberStorageKey(orgId)) ?? ALL_NUMBERS : ALL_NUMBERS
  );
  // Solo podamos la seleccion contra un fetch ya asentado: durante uno en vuelo
  // `conversations` todavia tiene los datos de la organizacion anterior.
  const hasFetchedRef = useRef(false);

  const selectNumber = (value: string) => {
    setSelectedNumberId(value);
    if (!orgId) return;
    if (value === ALL_NUMBERS) localStorage.removeItem(numberStorageKey(orgId));
    else localStorage.setItem(numberStorageKey(orgId), value);
  };

  const fetchConversations = async () => {
    if (!currentOrganization?.id || !user?.id || !userRole) return;
    setLoading(true);

    let query = supabase
      .from('wa_conversations')
      .select(`
        *,
        contact:contacts(id, full_name, phone),
        whatsapp_number:whatsapp_numbers(id, display_name, phone_number),
        wa_messages(content, created_at, direction, delivery_status, message_type)
      `)
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'open')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);

    if (!isInboxAdmin) {
      query = query.eq('assigned_to', user.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      setConversations(data);
      hasFetchedRef.current = true;
    }
    setLoading(false);
  };

  // El inicializador lazy de useState corre una sola vez, asi que al cambiar de
  // organizacion hay que releer la preferencia guardada de la nueva.
  useEffect(() => {
    hasFetchedRef.current = false;
    setSelectedNumberId(
      orgId ? localStorage.getItem(numberStorageKey(orgId)) ?? ALL_NUMBERS : ALL_NUMBERS
    );
  }, [orgId]);

  useEffect(() => {
    fetchConversations();

    // Realtime subscription
    if (!currentOrganization?.id || !user?.id || !userRole) return;

    const channel = supabase
      .channel('wa_conversations_list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wa_conversations',
          filter: isInboxAdmin
            ? `organization_id=eq.${currentOrganization.id}`
            : `assigned_to=eq.${user.id}`,
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
  }, [currentOrganization?.id, isInboxAdmin, user?.id, userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDisplayName = (conv: any) =>
    conv.contact?.full_name || conv.push_name || conv.contact?.phone || conv.phone_number || 'Desconocido';

  const getDisplayPhone = (conv: any) =>
    conv.contact?.phone || conv.phone_number || '';

  // Derivado de `conversations` (no de `filtered`) para que los conteos no dependan
  // del buscador, y sin query extra: los numeros salen del embed que ya traemos.
  const derivedNumbers = useMemo(() => {
    const byId = new Map<string, { id: string; display_name: string; count: number }>();
    for (const conv of conversations) {
      const num = conv.whatsapp_number;
      if (!num?.id) continue;
      const existing = byId.get(num.id);
      if (existing) existing.count += 1;
      else byId.set(num.id, { id: num.id, display_name: num.display_name, count: 1 });
    }
    return [...byId.values()].sort((a, b) => b.count - a.count);
  }, [conversations]);

  // Si se cierra la ultima conversacion del numero filtrado, volver a "Todos".
  useEffect(() => {
    if (!hasFetchedRef.current) return;
    if (selectedNumberId === ALL_NUMBERS || derivedNumbers.length === 0) return;
    if (derivedNumbers.some((n) => n.id === selectedNumberId)) return;
    selectNumber(ALL_NUMBERS);
  }, [derivedNumbers, selectedNumberId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se mantiene montado mientras haya un filtro activo, aunque queden menos de 2
  // numeros: si no, el filtro seguiria aplicandose sin control para limpiarlo.
  const showNumberSelector = derivedNumbers.length >= 2 || selectedNumberId !== ALL_NUMBERS;

  const filtered = conversations.filter((conv) => {
    if (selectedNumberId !== ALL_NUMBERS && conv.whatsapp_number_id !== selectedNumberId) {
      return false;
    }
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = getDisplayName(conv).toLowerCase();
    const phone = getDisplayPhone(conv).toLowerCase();
    return name.includes(s) || phone.includes(s);
  });

  const getLastMessage = (conv: any) => {
    const msgs = conv.wa_messages;
    if (!msgs || msgs.length === 0) return null;
    return msgs.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  // Solo en la carga inicial: `fetchConversations` tambien corre en cada evento de
  // realtime, y desmontar el header ahi cierra el dropdown y roba el foco al buscador.
  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Cargando conversaciones...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b space-y-2">
        {showNumberSelector && (
          <Select value={selectedNumberId} onValueChange={selectNumber}>
            <SelectTrigger className="h-9 text-sm [&>span]:truncate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_NUMBERS}>
                Todos los números ({conversations.length})
              </SelectItem>
              <SelectSeparator />
              {derivedNumbers.map((num) => (
                <SelectItem key={num.id} value={num.id}>
                  {num.display_name} ({num.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
              {search || selectedNumberId !== ALL_NUMBERS
                ? 'Sin resultados'
                : 'No hay conversaciones abiertas'}
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
                      {getDisplayName(conv)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium truncate">
                        {getDisplayName(conv)}
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
