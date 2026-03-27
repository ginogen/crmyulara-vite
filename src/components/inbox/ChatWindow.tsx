import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Image, File, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchConversation = async () => {
    const { data } = await supabase
      .from('wa_conversations')
      .select(`
        *,
        contact:contacts(id, full_name, phone),
        whatsapp_number:whatsapp_numbers(id, display_name, phone_number, api_key)
      `)
      .eq('id', conversationId)
      .single();
    setConversation(data);
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wa_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!conversationId) return;
    fetchConversation();
    fetchMessages();

    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wa_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m: any) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;
    if (!conversation?.whatsapp_number?.id) {
      toast.error('No hay número WhatsApp configurado para esta conversación');
      return;
    }

    const recipientPhone = conversation.contact?.phone;
    if (!recipientPhone) {
      toast.error('No se encontró el número del contacto');
      return;
    }

    setSending(true);
    try {
      let body: any = {
        whatsapp_number_id: conversation.whatsapp_number.id,
        to: recipientPhone,
        conversation_id: conversationId,
      };

      if (selectedFile) {
        const isImage = selectedFile.type.startsWith('image/');
        const isAudio = selectedFile.type.startsWith('audio/');
        const type = isImage ? 'image' : isAudio ? 'audio' : 'document';

        const arrayBuffer = await selectedFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        body = {
          ...body,
          type,
          media: base64,
          mimetype: selectedFile.type,
          filename: selectedFile.name,
          message: messageText || '',
        };
      } else {
        body = { ...body, type: 'text', message: messageText };
      }

      const { data, error } = await supabase.functions.invoke('wasender-send-message', { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessageText('');
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getDeliveryIcon = (status: string) => {
    if (status === 'read') return '✓✓';
    if (status === 'delivered') return '✓✓';
    if (status === 'sent') return '✓';
    if (status === 'failed') return '✗';
    return '○';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">
            {(conversation?.contact?.full_name || conversation?.contact?.phone || '?')[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium">
            {conversation?.contact?.full_name || conversation?.contact?.phone || 'Desconocido'}
          </p>
          <p className="text-xs text-muted-foreground">{conversation?.contact?.phone}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900/20">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Sin mensajes aún
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div
                key={msg.id}
                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    isOutbound
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-background border rounded-bl-sm'
                  }`}
                >
                  {msg.message_type === 'image' && msg.media_url && (
                    <img
                      src={msg.media_url}
                      alt="Imagen"
                      className="rounded-lg max-w-[200px] mb-1 cursor-pointer"
                      onClick={() => window.open(msg.media_url, '_blank')}
                    />
                  )}
                  {msg.message_type === 'audio' && msg.media_url && (
                    <audio controls className="max-w-[200px] mb-1">
                      <source src={msg.media_url} />
                    </audio>
                  )}
                  {msg.message_type === 'document' && msg.media_url && (
                    <a
                      href={msg.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 underline mb-1"
                    >
                      <File className="w-4 h-4" />
                      {msg.metadata?.filename || 'Documento'}
                    </a>
                  )}
                  {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  <div
                    className={`flex items-center gap-1 mt-0.5 text-xs ${
                      isOutbound ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'
                    }`}
                  >
                    <span>
                      {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                    </span>
                    {isOutbound && (
                      <span
                        className={msg.delivery_status === 'read' ? 'text-blue-300' : ''}
                      >
                        {getDeliveryIcon(msg.delivery_status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t bg-background">
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg text-sm">
            <File className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 truncate">{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="w-4 h-4" />
          </Button>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="flex-1 h-9"
            disabled={sending}
          />
          <Button
            size="icon"
            className="flex-shrink-0 h-9 w-9"
            onClick={sendMessage}
            disabled={sending || (!messageText.trim() && !selectedFile)}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
