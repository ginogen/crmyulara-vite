import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import InboxList from '../../components/inbox/InboxList';
import MessageView from '../../components/inbox/MessageView';
import type { Database } from '../../lib/supabase/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

export default function InboxPage() {
  const navigate = useNavigate();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bandeja de Entrada</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <InboxList onSelectMessage={handleSelectMessage} />
        </div>
        <div className="md:col-span-2">
          {selectedMessage ? (
            <MessageView message={selectedMessage} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Selecciona un mensaje para ver su contenido
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 