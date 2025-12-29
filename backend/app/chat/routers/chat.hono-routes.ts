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
  description:
    'Streams assistant responses as Server-Sent Events (SSE). This route is registered for OpenAPI documentation but handled by Lambda streaming response handler.',
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
  description:
    'Streams AI responses enriched with session context. This route is registered for OpenAPI documentation but handled by Lambda streaming response handler.',
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
 * Register chat routes in Hono app for OpenAPI generation
 * Note: These handlers are NEVER called in production - Lambda handles requests directly
 * This is purely for OpenAPI spec generation
 *
 * @param app - The Hono app instance
 * @param registerHandlers - If false, only register routes for OpenAPI docs without handlers (useful for dev mode)
 */
export function registerChatRoutes(app: App, registerHandlers = true) {
  if (registerHandlers) {
    // Production mode: register with error-throwing handlers
    // (these should never actually be called since Lambda handles it)
    app.openapi(streamChatRoute, () => {
      throw new Error('This route should be handled by Lambda streaming handler');
    });

    app.openapi(streamSessionChatRoute, () => {
      throw new Error('This route should be handled by Lambda streaming handler');
    });
  } else {
    // Dev mode: register only the OpenAPI metadata without handlers
    // The actual handlers are registered separately in dev.ts
    app.openapi(streamChatRoute, () => {
      // This is a placeholder that should never be called in dev
      // because the real handlers are registered first
      throw new Error('Dev mode: Real handler should have been matched first');
    });

    app.openapi(streamSessionChatRoute, () => {
      throw new Error('Dev mode: Real handler should have been matched first');
    });
  }
}
