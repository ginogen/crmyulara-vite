import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useInbox } from '@/hooks/useInbox';
import { MessageView } from '@/components/inbox/MessageView';

export function InboxPage() {
  const { messages, isLoading, markAsRead, deleteMessage } = useInbox();
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  if (isLoading) {
    return <div>Cargando mensajes...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bandeja de Entrada</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Mensajes</h2>
          </div>
          <div className="divide-y">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedMessage === message.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedMessage(message.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{message.subject}</h3>
                    <p className="text-sm text-gray-500">{message.sender}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(message.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {selectedMessage ? (
            <MessageView
              message={messages.find((m) => m.id === selectedMessage)!}
              onMarkAsRead={() => markAsRead(selectedMessage)}
              onDelete={() => {
                deleteMessage(selectedMessage);
                setSelectedMessage(null);
              }}
            />
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
              Selecciona un mensaje para ver su contenido
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 