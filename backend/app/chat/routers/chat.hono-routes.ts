import { createRoute } from '@hono/zod-openapi';

import { z } from 'zod';

import type { App } from '../../common/utils/routes.util';
import { ChatStreamRequestSchema, chatStreamResponseSchema } from '../models/chat-stream.model';

/**
 * Generic chat route - for OpenAPI docs only
 * Actual handling is done by Lambda streaming handler
 */
export const streamChatRoute = createRoute({
  method: 'post',
  path: '/chat/v1/stream',
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
        },
      },
    },
    400: {
      description: 'Invalid request body',
    },
    401: {
      description: 'Unauthorized - missing or invalid authentication',
    },
  },
});

/**
 * Session-specific chat route - for OpenAPI docs only
 * Actual handling is done by Lambda streaming handler
 */
export const streamSessionChatRoute = createRoute({
  method: 'post',
  path: '/chat/v1/sessions/{sessionId}/stream',
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
        },
      },
    },
    400: {
      description: 'Invalid request body',
    },
    401: {
      description: 'Unauthorized - missing or invalid authentication',
    },
    404: {
      description: 'Session not found',
    },
  },
});

/**
 * Register chat routes in Hono app for OpenAPI generation
 * Note: These handlers are NEVER called - Lambda handles requests directly
 * This is purely for OpenAPI spec generation
 */
export function registerChatRoutes(app: App) {
  app.openapi(streamChatRoute, () => {
    // This handler is NEVER called - Lambda handles it directly
    // But we need this for OpenAPI spec generation
    throw new Error('This route should be handled by Lambda streaming handler');
  });

  app.openapi(streamSessionChatRoute, () => {
    throw new Error('This route should be handled by Lambda streaming handler');
  });
}
