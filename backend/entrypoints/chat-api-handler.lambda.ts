import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import 'reflect-metadata';
import type { Writable } from 'stream';

import { ChatRouter } from '../app/chat/routers/chat.router';
import { getAppLogger } from '../app/common/utils/logger.util';

import { buildChatRouter } from './containers/chat-service.container';

const logger = getAppLogger('chat-api-handler');

type StreamResponseHandler = (
  event: APIGatewayProxyEventV2 | APIGatewayProxyEvent,
  responseStream: Writable,
) => Promise<void>;

/**
 * AWS Lambda runtime extensions for response streaming
 * These are provided by the Lambda runtime and not in standard Node.js
 */
declare const awslambda: {
  streamifyResponse: (handler: StreamResponseHandler) => unknown;
  HttpResponseStream: {
    from: (stream: Writable, metadata: { statusCode: number; headers: Record<string, string> }) => Writable;
  };
};

let router: ChatRouter | null = null;

/**
 * Get or initialize the chat router
 * Singleton pattern for Lambda container reuse
 */
async function getRouter(): Promise<ChatRouter> {
  if (!router) {
    logger.info('Initializing chat router');
    router = await buildChatRouter();
  }
  return router;
}

/**
 * Lambda handler for streaming chat responses
 * Uses AWS Lambda Response Streaming to send Server-Sent Events (SSE)
 *
 * Key patterns:
 * - Direct Lambda streaming (not Hono) for optimal performance
 * - Singleton router for container reuse
 * - Proper CORS handling
 * - Comprehensive error handling with SSE error events
 */
export const handler = awslambda.streamifyResponse(async (event, responseStream) => {
  const method = 'httpMethod' in event ? event.httpMethod : event.requestContext.http.method;
  const path = 'path' in event ? event.path : event.rawPath;

  logger.info('Received chat stream request', { method, path });

  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    logger.info('Handling OPTIONS request');
    httpStream.write('data: OK\\n\\n');
    httpStream.end();
    return;
  }

  try {
    const router = await getRouter();
    const stream = await router.route(event);

    logger.info('Starting SSE stream');

    // Stream AI responses as Server-Sent Events
    for await (const chunk of stream.toUIMessageStream()) {
      httpStream.write(`data: ${JSON.stringify(chunk)}\\n\\n`);
    }

    logger.info('SSE stream completed successfully');
    httpStream.end();
  } catch (error) {
    logger.error('Chat stream error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Send error as SSE event
    httpStream.write(`data: ${JSON.stringify({ type: 'error', errorText: message })}\\n\\n`);
    httpStream.end();
  }
});
