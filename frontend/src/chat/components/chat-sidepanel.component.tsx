import { useChat } from '@ai-sdk/react';

import { FormEvent, useEffect, useState } from 'react';

import type { ChatTransportConfig } from '../../main/utils/clients/chat-client.util';
import { getChatClientUtil } from '../../main/utils/clients/chat-client.util';

import { ChatHeader } from './chat-header.component';
import { ChatInput } from './chat-input.component';
import { ChatMessageList } from './chat-message-list.component';

interface ChatSidepanelProps {
  sessionId: string;
  title?: string;
}

/**
 * Compact chat sidepanel component
 * Designed to be embedded in other screens (e.g., session detail views)
 * Always uses session-specific chat with context
 */
export function ChatSidepanel({ sessionId, title }: ChatSidepanelProps) {
  const [streamError, setStreamError] = useState<string | null>(null);
  const [config, setConfig] = useState<ChatTransportConfig | undefined>(undefined);

  // Initialize transport for session-specific chat
  useEffect(() => {
    const initTransport = async () => {
      try {
        const chatClient = getChatClientUtil();
        const newTransport = await chatClient.getTransport(sessionId);
        setConfig(newTransport);
      } catch (error) {
        console.error('[ChatSidepanel] Failed to initialize transport:', error);
        setStreamError(error instanceof Error ? error.message : 'Failed to initialize chat');
      }
    };

    if (sessionId) {
      initTransport();
    }
  }, [sessionId]);

  const { messages, sendMessage, status, error } = useChat({
    ...(config && {
      body: config,
      streamProtocol: 'text',
    }),
    onError: (err) => {
      console.error('[ChatSidepanel] Stream error:', err);
      setStreamError(err.message);
    },
  });

  const handleSubmit = (message: { text: string }, _e: FormEvent) => {
    if (message.text.trim()) {
      setStreamError(null);
      sendMessage({ text: message.text });
    }
  };

  const displayError = error?.message || streamError;
  const effectiveStatus = error ? 'ready' : status;

  return (
    <div className="chat-compact flex h-full flex-col overflow-hidden bg-white">
      <ChatHeader title={title} />
      <ChatMessageList messages={messages} isStreaming={effectiveStatus === 'streaming'} error={displayError} />
      <ChatInput onSubmit={handleSubmit} status={effectiveStatus} placeholder="Ask about this session..." />
    </div>
  );
}
