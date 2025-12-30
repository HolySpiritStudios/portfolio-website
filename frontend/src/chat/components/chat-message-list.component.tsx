import type { UIMessage } from 'ai';
import { AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { ChatMessageItem } from './chat-message-item.component';

interface ChatMessageListProps {
  messages: UIMessage[];
  isStreaming?: boolean;
  error?: string | null;
}

export function ChatMessageList({ messages, isStreaming = false, error }: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div ref={containerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
      {messages.length === 0 && !error && (
        <div className="flex h-full items-center justify-center">
          <p className="text-lg text-muted-foreground">Start a conversation...</p>
        </div>
      )}

      {messages.map((message, idx) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          isStreaming={isStreaming}
          isLast={idx === messages.length - 1}
        />
      ))}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
