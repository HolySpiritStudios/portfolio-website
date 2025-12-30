import { useChat } from '@ai-sdk/react';

import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { getChatClientUtil } from '../../main/utils/clients/chat-client.util';
import { ChatHeader } from '../components/chat-header.component';
import { ChatInput } from '../components/chat-input.component';
import { ChatMessageList } from '../components/chat-message-list.component';

/**
 * Full-screen chat interface
 * Supports both generic chat and session-specific chat based on URL parameter
 *
 * Routes:
 * - /chat/v1/stream - Generic chat without context
 * - /chat/v1/sessions/:sessionId/stream - Session-specific chat with context
 */
export function ChatScreen() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [streamError, setStreamError] = useState<string | null>(null);

  const transport = useMemo(
    () => (sessionId ? getChatClientUtil().getTransport(sessionId) : getChatClientUtil().getGenericTransport()),
    [sessionId],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
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
