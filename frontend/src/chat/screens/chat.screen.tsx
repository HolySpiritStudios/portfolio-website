import { useChat } from '@ai-sdk/react';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router';

import type { ChatTransportConfig } from '../../main/utils/clients/chat-client.util';
import { getChatClientUtil } from '../../main/utils/clients/chat-client.util';
import { ChatHeader } from '../components/chat-header.component';
import { ChatInput } from '../components/chat-input.component';
import { ChatMessageList } from '../components/chat-message-list.component';

/**
 * Full-screen chat interface
 * Supports both generic chat and session-specific chat based on URL parameter
 *
 * Routes:
 * - /chat - Generic chat without context
 * - /chat/sessions/:sessionId - Session-specific chat with context
 */
export function ChatScreen() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [streamError, setStreamError] = useState<string | null>(null);
  const [config, setConfig] = useState<ChatTransportConfig | undefined>(undefined);

  // Initialize transport based on session ID
  useEffect(() => {
    const initTransport = async () => {
      try {
        const chatClient = getChatClientUtil();
        const newTransport = sessionId
          ? await chatClient.getTransport(sessionId)
          : await chatClient.getGenericTransport();
        setConfig(newTransport);
      } catch (error) {
        console.error('[ChatScreen] Failed to initialize transport:', error);
        setStreamError(error instanceof Error ? error.message : 'Failed to initialize chat');
      }
    };

    initTransport();
  }, [sessionId]);

  const { messages, sendMessage, status, error } = useChat({
    ...(config && {
      body: config,
      streamProtocol: 'text',
    }),
    onError: (err) => {
      console.error('[ChatScreen] Stream error:', err);
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
    <div className="flex h-screen flex-col bg-background">
      <ChatHeader title={sessionId ? `Session Chat: ${sessionId}` : 'Chat'} />
      <ChatMessageList messages={messages} isStreaming={effectiveStatus === 'streaming'} error={displayError} />
      <ChatInput onSubmit={handleSubmit} status={effectiveStatus} />
    </div>
  );
}
