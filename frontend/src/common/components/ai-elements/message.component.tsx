import { Bot, User } from 'lucide-react';
import React from 'react';
import { Streamdown } from 'streamdown';

import { cn } from '../../utils/cn.util';

interface MessageProps {
  from: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
}

export function Message({ from, children }: MessageProps) {
  return (
    <div className={cn('flex gap-3', from === 'user' ? 'justify-end' : 'justify-start')}>
      {from === 'assistant' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={cn('flex max-w-[80%] flex-col', from === 'user' && 'items-end')}>{children}</div>
      {from === 'user' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

interface MessageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MessageContent({ children, className }: MessageContentProps) {
  return <div className={cn('break-words', className)}>{children}</div>;
}

interface MessageResponseProps {
  children: string;
  className?: string;
}

export function MessageResponse({ children, className }: MessageResponseProps) {
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      <Streamdown>{children}</Streamdown>
    </div>
  );
}
