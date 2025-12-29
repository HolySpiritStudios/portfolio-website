import { createRoute } from '@hono/zod-openapi';
import { API_ROUTES } from '@ws-mono/shared';

import { z } from 'zod';

import type { App } from '../../common/utils/routes.util';
import { errorResponses } from '../../common/utils/routes.util';
import { ChatStreamRequestSchema, chatStreamResponseSchema } from '../models/chat-stream.model';

/**
 * Generic chat route - for OpenAPI docs only
 * Actual handling is done by Lambda streaming handler
 */
export const streamChatRoute = createRoute({
  method: 'post',
  path: API_ROUTES.CHAT.STREAM,
  tags: ['Chat'],
  summary: 'Stream AI chat responses',
  description: 'Streams assistant responses as Server-Sent Events (SSE).',
  security: [{ cognito: ['openid'] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChatStreamRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'SSE stream of chat messages',
      content: {
        'text/event-stream': {
          schema: chatStreamResponseSchema,
          example: 'data: {"type":"text-delta","content":"Hello"}\n\ndata: {"type":"finish"}\n\n',
        },
      },
    },
    ...errorResponses,
  },
});

/**
 * Session-specific chat route - for OpenAPI docs only
 * Actual handling is done by Lambda streaming handler
 */
export const streamSessionChatRoute = createRoute({
  method: 'post',
  path: API_ROUTES.CHAT.SESSION_STREAM,
  tags: ['Chat'],
  summary: 'Stream context-aware chat responses',
  description: 'Streams AI responses enriched with session context.',
  security: [{ cognito: ['openid'] }],
  request: {
    params: z.object({
      sessionId: z.string().describe('Session identifier for contextual chat'),
    }),
    body: {
      content: {
        'application/json': {
          schema: ChatStreamRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'SSE stream of chat messages with session context',
      content: {
        'text/event-stream': {
          schema: chatStreamResponseSchema,
          example: 'data: {"type":"text-delta","content":"Based on your session"}\n\ndata: {"type":"finish"}\n\n',
        },
      },
    },
    ...errorResponses,
    404: {
      description: 'Session not found',
      content: {
        'application/json': { schema: z.object({ message: z.string() }) },
      },
    },
  },
});

/**
 * Register chat routes in Hono app for OpenAPI generation.
 *
 * Note: These routes are NOT actively handled by Hono in production or development.
 * - In AWS: The Lambda streaming handler intercepts these requests before Hono.
 * - In Dev: The registerLocalChatRoutes function in dev.ts intercepts them.
 *
 * We register them here solely to include them in the OpenAPI/Swagger documentation.
 *
 * @param app - The Hono app instance
 */
export function registerChatRoutes(app: App) {
  const handler = () => {
    throw new Error('This route should be handled by a streaming-capable handler');
  };

  app.openapi(streamChatRoute, handler);
  app.openapi(streamSessionChatRoute, handler);
}
