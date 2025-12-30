import type { DynamicToolUIPart, ReasoningUIPart, ToolUIPart, UIMessage } from 'ai';

import { Message, MessageContent, MessageResponse } from '../../common/components/ai-elements/message.component';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '../../common/components/ai-elements/reasoning.component';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '../../common/components/ai-elements/tool.component';

type Part = UIMessage['parts'][number];

interface ChatMessageItemProps {
  message: UIMessage;
  isStreaming?: boolean;
  isLast?: boolean;
}

const isToolPart = (part: Part): part is ToolUIPart | DynamicToolUIPart =>
  part.type.startsWith('tool-') || part.type === 'dynamic-tool';

const isReasoningPart = (part: Part): part is ReasoningUIPart => part.type === 'reasoning';

const getToolType = (part: ToolUIPart | DynamicToolUIPart): `tool-${string}` =>
  part.type === 'dynamic-tool' ? `tool-${part.toolName}` : part.type;

export function ChatMessageItem({ message, isStreaming = false, isLast = false }: ChatMessageItemProps) {
  const renderPart = (part: Part, idx: number) => {
    if (part.type === 'text') {
      return <MessageResponse key={idx}>{part.text}</MessageResponse>;
    }

    if (isReasoningPart(part)) {
      const isLastPart = idx === message.parts.length - 1;
      return (
        <Reasoning key={idx} isStreaming={isStreaming && isLast && isLastPart}>
          <ReasoningTrigger className="text-xs" />
          <ReasoningContent className="text-xs">{part.text}</ReasoningContent>
        </Reasoning>
      );
    }

    if (isToolPart(part)) {
      return (
        <div key={idx} className="pt-2">
          <Tool className="text-xs">
            <ToolHeader className="p-2 text-xs" state={part.state} type={getToolType(part)} />
            <ToolContent>
              <ToolInput className="overflow-x-auto p-2 text-xs" input={part.input} />
              <ToolOutput className="overflow-x-auto p-2 text-xs" errorText={part.errorText} output={part.output} />
            </ToolContent>
          </Tool>
        </div>
      );
    }

    return null;
  };

  return (
    <Message from={message.role}>
      <MessageContent
        className={message.role === 'assistant' ? 'rounded-lg bg-secondary/50 px-3 py-2 text-sm' : 'px-3 py-2 text-sm'}
      >
        {message.parts?.map(renderPart)}
      </MessageContent>
    </Message>
  );
}
