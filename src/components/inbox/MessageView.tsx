import { Button } from '@/components/ui/Button';

type Message = {
  id: string;
  subject: string;
  content: string;
  sender: string;
  created_at: string;
  is_read: boolean;
};

interface MessageViewProps {
  message: Message;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

export const MessageView = ({ message, onMarkAsRead, onDelete }: MessageViewProps) => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{message.subject}</h2>
          <p className="text-sm text-gray-500">
            De: {message.sender} • {new Date(message.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onMarkAsRead}>
            {message.is_read ? 'Marcar como no leído' : 'Marcar como leído'}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            Eliminar
          </Button>
        </div>
      </div>
      <div className="prose max-w-none">
        <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}; 