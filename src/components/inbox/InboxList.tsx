import { useState } from 'react';
import { Button } from '../ui/Button';
import type { Database } from '../../lib/supabase/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

interface InboxListProps {
  onSelectMessage: (message: Message) => void;
}

export default function InboxList({ onSelectMessage }: InboxListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Implementar la carga de mensajes desde Supabase

  if (isLoading) {
    return <div>Cargando mensajes...</div>;
  }

  if (messages.length === 0) {
    return <div>No hay mensajes disponibles.</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
      {messages.map((message) => (
        <div
          key={message.id}
          className="p-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => onSelectMessage(message)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {message.sender_name}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {message.subject}
              </p>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(message.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {message.content}
          </p>
        </div>
      ))}
    </div>
  );
} 