import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Image, Bot, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChatMessage } from './ChatMessage';
import { VoiceRecorder } from './VoiceRecorder';
import { MediaPreview } from './MediaPreview';

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { currentOrganization, user, userRole } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [takingOver, setTakingOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const isInboxAdmin = userRole === 'super_admin' || userRole === 'org_admin';

  const fetchConversation = async () => {
    if (!currentOrganization?.id || !user?.id || !userRole) return;

    let query = supabase
      .from('wa_conversations')
      .select(`
        *,
        contact:contacts(id, full_name, phone),
        whatsapp_number:whatsapp_numbers(id, display_name, phone_number)
      `)
      .eq('id', conversationId)
      .eq('organization_id', currentOrganization.id);

    if (!isInboxAdmin) {
      query = query.eq('assigned_to', user.id);
    }

    const { data } = await query.single();
    setConversation(data);
  };

  const handleTakeOver = async () => {
    setTakingOver(true);
    try {
      await supabase
        .from('wa_conversations')
        .update({ bot_active: false })
        .eq('id', conversationId);
      setConversation((prev: any) => prev ? { ...prev, bot_active: false } : prev);
      toast.success('Conversación tomada por el asesor');
    } catch {
      toast.error('Error al tomar la conversación');
    } finally {
      setTakingOver(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;
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
    if (!conversationId || !currentOrganization?.id || !user?.id || !userRole) return;
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
            setMessages((prev) => {
              const withoutOptimistic = prev.filter((m) => !m._optimistic);
              if (withoutOptimistic.some((m) => m.id === payload.new.id)) return withoutOptimistic;
              return [...withoutOptimistic, payload.new].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m: any) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wa_conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload: any) => {
          setConversation((prev: any) => prev ? { ...prev, ...payload.new } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentOrganization?.id, user?.id, userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getFileType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const sendMessage = async (overrideFile?: File) => {
    const fileToSend = overrideFile || selectedFile;
    if (!messageText.trim() && !fileToSend) return;
    if (!conversation?.whatsapp_number?.id) {
      toast.error('No hay numero WhatsApp configurado para esta conversacion');
      return;
    }

    const recipientPhone = conversation.contact?.phone || conversation.phone_number;
    if (!recipientPhone) {
      toast.error('No se encontro el numero del contacto');
      return;
    }

    const currentText = messageText;
    const currentFile = fileToSend;
    setMessageText('');
    setSelectedFile(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: any = {
      id: optimisticId,
      conversation_id: conversationId,
      direction: 'outbound',
      content: currentText,
      message_type: currentFile ? getFileType(currentFile) : 'text',
      delivery_status: 'sending',
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      let body: any = {
        whatsapp_number_id: conversation.whatsapp_number.id,
        to: recipientPhone,
        conversation_id: conversationId,
      };

      if (currentFile) {
        const type = getFileType(currentFile);

        const arrayBuffer = await currentFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        body = {
          ...body,
          type,
          media: base64,
          mimetype: currentFile.type,
          filename: currentFile.name,
          message: currentText || '',
        };
      } else {
        body = { ...body, type: 'text', message: currentText };
      }

      const { data, error } = await supabase.functions.invoke('wasender-send-message', { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } catch (error: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, delivery_status: 'failed' } : m
        )
      );
      toast.error(error.message || 'Error al enviar mensaje');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceRecordingComplete = (blob: Blob) => {
    const audioFile = new File([blob], `voice-${Date.now()}.webm`, {
      type: 'audio/webm;codecs=opus',
    });
    sendMessage(audioFile);
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
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-primary">
            {(conversation?.contact?.full_name || conversation?.push_name || conversation?.phone_number || '?')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {conversation?.contact?.full_name || conversation?.push_name || conversation?.phone_number || 'Desconocido'}
            </p>
            {conversation?.bot_active && (
              <Badge className="bg-violet-500 hover:bg-violet-500 text-xs px-1.5 py-0 flex items-center gap-1 flex-shrink-0">
                <Bot className="w-3 h-3" />
                Bot activo
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{conversation?.contact?.phone || conversation?.phone_number}</p>
        </div>
        {conversation?.bot_active && (
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 h-8 text-xs"
            onClick={handleTakeOver}
            disabled={takingOver}
          >
            {takingOver ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <UserCheck className="w-3 h-3 mr-1" />
                Tomar conversación
              </>
            )}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900/20">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Sin mensajes aun
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t bg-background">
        {selectedFile && (
          <MediaPreview
            file={selectedFile}
            onRemove={() => setSelectedFile(null)}
          />
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] || null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
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
          />
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            disabled={!!selectedFile}
          />
          <Button
            size="icon"
            className="flex-shrink-0 h-9 w-9"
            onClick={() => sendMessage()}
            disabled={!messageText.trim() && !selectedFile}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
