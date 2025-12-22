import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '../../utils/cn.util';

interface ReasoningProps {
  children: React.ReactNode;
  isStreaming?: boolean;
}

const ReasoningContext = React.createContext<{ isOpen: boolean; toggle: () => void } | undefined>(undefined);

function useReasoning() {
  const context = React.useContext(ReasoningContext);
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning');
  }
  return context;
}

export function Reasoning({ children, isStreaming = false }: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(isStreaming);

  React.useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    }
  }, [isStreaming]);

  return (
    <ReasoningContext.Provider value={{ isOpen, toggle: () => setIsOpen(!isOpen) }}>
      <div className="my-2 rounded-lg border border-muted bg-muted/30">{children}</div>
    </ReasoningContext.Provider>
  );
}

interface ReasoningTriggerProps {
  className?: string;
}

export function ReasoningTrigger({ className }: ReasoningTriggerProps) {
  const { isOpen, toggle } = useReasoning();

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50',
        className,
      )}
    >
      <span className="text-muted-foreground">Reasoning</span>
      <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
    </button>
  );
}

interface ReasoningContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ReasoningContent({ children, className }: ReasoningContentProps) {
  const { isOpen } = useReasoning();

  if (!isOpen) return null;

  return (
    <div className={cn('border-t border-muted px-3 py-2 text-sm text-muted-foreground', className)}>{children}</div>
  );
}
