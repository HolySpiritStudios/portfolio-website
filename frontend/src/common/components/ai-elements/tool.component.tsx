import { AlertCircle, CheckCircle, Loader2, Wrench } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '../../utils/cn.util';

interface ToolProps {
  children: React.ReactNode;
  className?: string;
}

const ToolContext = React.createContext<{ isOpen: boolean; toggle: () => void } | undefined>(undefined);

function useTool() {
  const context = React.useContext(ToolContext);
  if (!context) {
    throw new Error('Tool components must be used within Tool');
  }
  return context;
}

export function Tool({ children, className }: ToolProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ToolContext.Provider value={{ isOpen, toggle: () => setIsOpen(!isOpen) }}>
      <div className={cn('rounded-lg border border-muted bg-muted/30', className)}>{children}</div>
    </ToolContext.Provider>
  );
}

interface ToolHeaderProps {
  type: `tool-${string}`;
  state:
    | 'call'
    | 'result'
    | 'partial-call'
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error';
  className?: string;
}

export function ToolHeader({ type, state, className }: ToolHeaderProps) {
  const { toggle } = useTool();
  const toolName = type.replace('tool-', '');

  const getIcon = () => {
    if (state === 'partial-call' || state === 'input-streaming' || state === 'input-available') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (state === 'result' || state === 'output-available') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (state === 'output-error') {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return <Wrench className="h-4 w-4" />;
  };

  const getStateLabel = () => {
    if (state === 'partial-call' || state === 'input-streaming') return 'calling...';
    if (state === 'input-available') return 'processing...';
    if (state === 'output-available') return 'completed';
    if (state === 'output-error') return 'error';
    return state;
  };

  return (
    <button
      onClick={toggle}
      className={cn('flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50', className)}
    >
      {getIcon()}
      <span className="flex-1 text-left">{toolName}</span>
      <span className="text-xs text-muted-foreground">{getStateLabel()}</span>
    </button>
  );
}

interface ToolContentProps {
  children: React.ReactNode;
}

export function ToolContent({ children }: ToolContentProps) {
  const { isOpen } = useTool();

  if (!isOpen) return null;

  return <div className="border-t border-muted">{children}</div>;
}

interface ToolInputProps {
  input: unknown;
  className?: string;
}

export function ToolInput({ input, className }: ToolInputProps) {
  return (
    <div className={cn('font-mono', className)}>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">Input:</div>
      <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(input, null, 2)}</pre>
    </div>
  );
}

interface ToolOutputProps {
  output?: unknown;
  errorText?: string;
  className?: string;
}

export function ToolOutput({ output, errorText, className }: ToolOutputProps) {
  if (errorText) {
    return (
      <div className={cn('font-mono text-destructive', className)}>
        <div className="mb-1 flex items-center gap-1 text-xs font-semibold">
          <AlertCircle className="h-3 w-3" />
          Error:
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap">{errorText}</pre>
      </div>
    );
  }

  if (!output) {
    return null;
  }

  return (
    <div className={cn('font-mono', className)}>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">Output:</div>
      <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
}
