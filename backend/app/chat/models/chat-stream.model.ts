import { UIMessage } from 'ai';
import { z } from 'zod';

export type ChatMessage = UIMessage;

export const ChatStreamParamsSchema = z.object({
  sessionId: z.string().optional().describe('Optional session ID for contextual chat'),
});

export const ChatStreamRequestSchema = z.object({
  messages: z.array(z.custom<ChatMessage>()).min(1),
});

export type ChatStreamParams = z.infer<typeof ChatStreamParamsSchema>;
export type ChatStreamRequest = z.infer<typeof ChatStreamRequestSchema>;

// For Hono OpenAPI registration (response schema for documentation)
export const chatStreamResponseSchema = z.object({
  type: z.enum(['text-delta', 'tool-call', 'tool-result', 'error', 'finish']),
  content: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});
