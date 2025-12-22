import { FormEvent } from 'react';

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '../../common/components/ai-elements/prompt-input.component';

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

interface ChatInputProps {
  onSubmit: (message: { text: string }, e: FormEvent) => void;
  status: ChatStatus;
  placeholder?: string;
}

export function ChatInput({ onSubmit, status, placeholder = 'Ask something...' }: ChatInputProps) {
  const isDisabled = status === 'streaming' || status === 'submitted';

  return (
    <div className="border-t px-4 py-3">
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea className="text-sm" disabled={isDisabled} placeholder={placeholder} />
        <PromptInputFooter>
          <div />
          <PromptInputSubmit disabled={isDisabled} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
