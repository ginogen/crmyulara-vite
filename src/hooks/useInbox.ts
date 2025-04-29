import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

export function useInbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setMessages(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar mensajes');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMessages();
  }, [supabase]);

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar como leído');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar mensaje');
    }
  };

  return {
    messages,
    isLoading,
    error,
    markAsRead,
    deleteMessage,
  };
} 