import { Loader2, Send } from 'lucide-react';
import React, { FormEvent, forwardRef, useState } from 'react';

import { cn } from '../../utils/cn.util';

interface PromptInputContextValue {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const PromptInputContext = React.createContext<PromptInputContextValue | undefined>(undefined);

function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) {
    throw new Error('PromptInput components must be used within PromptInput');
  }
  return context;
}

interface PromptInputProps {
  onSubmit: (message: { text: string }, e: FormEvent) => void;
  children: React.ReactNode;
}

export function PromptInput({ onSubmit, children }: PromptInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault?.();
    if (value.trim()) {
      onSubmit({ text: value }, e);
      setValue('');
    }
  };

  return (
    <PromptInputContext.Provider
      value={{
        value,
        onChange: setValue,
        onSubmit: () => handleSubmit({} as FormEvent),
      }}
    >
      <form onSubmit={handleSubmit} className="w-full">
        {children}
      </form>
    </PromptInputContext.Provider>
  );
}

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    const { value, onChange } = usePromptInput();

    return (
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'min-h-[60px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

PromptInputTextarea.displayName = 'PromptInputTextarea';

interface PromptInputFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function PromptInputFooter({ children, className }: PromptInputFooterProps) {
  return <div className={cn('mt-2 flex items-center justify-between', className)}>{children}</div>;
}

interface PromptInputSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: 'submitted' | 'streaming' | 'ready' | 'error';
}

export function PromptInputSubmit({ status = 'ready', disabled, className, ...props }: PromptInputSubmitProps) {
  const { onSubmit } = usePromptInput();
  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
    </button>
  );
}
