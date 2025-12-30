import { useChat } from '@ai-sdk/react';

import { FormEvent, useMemo } from 'react';

import { getChatClientUtil } from '../../main/utils/clients/chat-client.util';

import { ChatHeader } from './chat-header.component';
import { ChatInput } from './chat-input.component';
import { ChatMessageList } from './chat-message-list.component';

interface ChatSidepanelProps {
  sessionId: string;
}

export const ChatSidepanel = ({ sessionId }: ChatSidepanelProps) => {
  const transport = useMemo(() => (sessionId ? getChatClientUtil().getTransport(sessionId) : undefined), [sessionId]);
  const { messages, sendMessage, status, error } = useChat({ transport });

  const handleSubmit = (message: { text: string }, _e: FormEvent) => {
    if (message.text.trim()) {
      sendMessage({ text: message.text });
    }
  };

  const displayError = error?.message;
  const effectiveStatus = error ? 'ready' : status;

  return (
    <div className="chat-compact flex h-full flex-col overflow-hidden bg-white">
      <ChatHeader />
      <ChatMessageList messages={messages} isStreaming={effectiveStatus === 'streaming'} error={displayError} />
      <ChatInput onSubmit={handleSubmit} status={effectiveStatus} />
    </div>
  );
};
