import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ChatWindow } from '@/components/inbox/ChatWindow';
import { ContactInfoPanel } from '@/components/inbox/ContactInfoPanel';
import { MessageCircle } from 'lucide-react';

export default function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [showContactInfo, setShowContactInfo] = useState(true);

  useEffect(() => {
    const convId = searchParams.get('conversation');
    if (convId) {
      setSelectedConversationId(convId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex h-full overflow-hidden -m-4">
      {/* Left: Conversation List */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col">
        <div className="px-4 py-3 border-b bg-background">
          <h2 className="text-sm font-semibold">Bandeja de entrada</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        </div>
      </div>

      {/* Center: Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversationId ? (
          <ChatWindow conversationId={selectedConversationId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <MessageCircle className="w-12 h-12 opacity-20" />
            <p className="text-sm">Selecciona una conversación para chatear</p>
          </div>
        )}
      </div>

      {/* Right: Contact Info Panel */}
      {selectedConversationId && showContactInfo && (
        <div className="w-64 flex-shrink-0 border-l overflow-y-auto">
          <ContactInfoPanel conversationId={selectedConversationId} />
        </div>
      )}
    </div>
  );
}
