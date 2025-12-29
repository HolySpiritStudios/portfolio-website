import { SSE_HEADERS } from '@ws-mono/shared';

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
    headers: SSE_HEADERS,
  });

  // Handle OPTIONS preflight requests
  if (method === 'OPTIONS') {
    logger.info('Handling OPTIONS preflight request');
    httpStream.write('data: OK\n\n');
    httpStream.end();
    return;
  }

  try {
    logger.info('Getting chat router...');
    const router = await getRouter();
    logger.info('Chat router initialized, routing request...');

    const stream = await router.route(event);
    logger.info('Starting SSE stream');

    // Stream AI responses as Server-Sent Events
    let chunkCount = 0;
    for await (const chunk of stream.toUIMessageStream()) {
      chunkCount++;
      httpStream.write(`data: ${JSON.stringify(chunk)}\n\n`);
      if (chunkCount % 10 === 0) {
        logger.debug(`Streamed ${chunkCount} chunks`);
      }
    }

    logger.info('SSE stream completed successfully', { totalChunks: chunkCount });
    httpStream.end();
  } catch (error) {
    logger.error('Chat stream error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      eventPath: path,
      eventMethod: method,
    });
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Send error as SSE event
    httpStream.write(`data: ${JSON.stringify({ type: 'error', errorText: message })}\n\n`);
    httpStream.end();
  }
});
