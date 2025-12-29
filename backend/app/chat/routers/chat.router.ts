import { API_ROUTES } from '@ws-mono/shared';

import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

import { extractAuthContext } from '../../common/utils/auth.util';
import { InvalidArgumentsError, NotFoundError } from '../../common/utils/errors';
import { getAppLogger } from '../../common/utils/logger.util';
import { routeToPattern } from '../../common/utils/routes.util';
import { ChatStreamResult, IChatController } from '../interfaces/chat-controller.interface';
import { ChatStreamRequestSchema } from '../models/chat-stream.model';

const logger = getAppLogger('chat-router');

const GENERIC_STREAM_PATTERN = routeToPattern(API_ROUTES.CHAT.STREAM);
const SESSION_STREAM_PATTERN = routeToPattern(API_ROUTES.CHAT.SESSION_STREAM);

/**
 * Router for chat streaming endpoints
 * Supports both generic and session-specific chat routes
 * Uses regex-based path matching for flexible routing
 */
export class ChatRouter {
  constructor(private readonly controller: IChatController) {}

  async route(event: APIGatewayProxyEvent | APIGatewayProxyEventV2): Promise<ChatStreamResult> {
    const method = 'httpMethod' in event ? event.httpMethod : event.requestContext.http.method;
    const path = 'path' in event ? event.path : event.rawPath;

    logger.info('Routing chat request', { method, path });

    if (method !== 'POST') {
      throw new InvalidArgumentsError(`Method ${method} not allowed`);
    }

    const body = JSON.parse(event.body ?? '{}');
    const authContext = extractAuthContext(event as APIGatewayProxyEvent);

    const parsed = ChatStreamRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new InvalidArgumentsError('Invalid request body: ' + parsed.error.message);
    }

    // Try session-specific route first (more specific)
    const sessionMatch = SESSION_STREAM_PATTERN.exec(path);
    if (sessionMatch) {
      const sessionId = decodeURIComponent(sessionMatch[1]);
      logger.info('Routing to session chat', { sessionId, userId: authContext.userId });
      return this.controller.streamSessionChat(sessionId, parsed.data.messages, authContext);
    }

    // Try generic route
    const genericMatch = GENERIC_STREAM_PATTERN.exec(path);
    if (genericMatch) {
      logger.info('Routing to generic chat', { userId: authContext.userId });
      return this.controller.streamChat(parsed.data.messages, authContext);
    }

    throw new NotFoundError(`No route found for ${method} ${path}`);
  }
}
