import { AssumeRoleCommand, Credentials, STSClient } from '@aws-sdk/client-sts';
import { serve } from '@hono/node-server';
import { API_ROUTES } from '@ws-mono/shared/constants/api-routes.constant';
import { SSE_HEADERS } from '@ws-mono/shared/constants/sse-headers.constant';

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { config as dotenvConfig } from 'dotenv';
import type { Context, Next } from 'hono';
import { decodeJwt } from 'jose';
import path from 'node:path';

import { registerChatRoutes } from '../app/chat/routers/chat.hono-routes';
import { DocsRouter } from '../app/common/routers/docs.router';
import { Environment, EnvironmentService } from '../app/common/utils/environment.util';
import { getAppLogger } from '../app/common/utils/logger.util';
import { App, RoutesService } from '../app/common/utils/routes.util';
import { buildAuthenticationRouter } from '../entrypoints/containers/auth-router.container';
import { buildChatRouter } from '../entrypoints/containers/chat-service.container';
import { buildHelloWorldRouter } from '../entrypoints/containers/hello-world-router.container';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

export async function buildDevApp(config: Partial<Environment> = {}): Promise<App> {
  const environmentService = new EnvironmentService(config);
  const routesService = new RoutesService(environmentService);

  const app = routesService.buildApp();
  app.use('*', localAuthMiddleware());

  // Handle favicon requests to prevent 404 errors in logs
  app.get('/favicon.ico', (c) => c.body(null, 204));

  await buildAuthenticationRouter(config, app);
  await buildHelloWorldRouter(config, app);

  // IMPORTANT: Register actual working chat handlers BEFORE the OpenAPI routes
  // Hono matches routes in order, so these will be used at runtime
  await registerLocalChatRoutes(config, app);

  // Register OpenAPI documentation routes for chat
  // These are registered AFTER actual handlers, but they still add metadata to OpenAPI spec
  // The handlers won't be called because Hono already matched the routes above
  registerChatRoutes(app);

  await DocsRouter.create(environmentService, routesService, app);

  return app;
}

const logger = getAppLogger('dev');

interface CognitoJWTPayload {
  sub: string;
  email: string;
  userId: string;
  'cognito:username'?: string;
  token_use: string;
}

/**
 * Register chat routes that actually work in local development
 * These routes handle streaming responses directly without Lambda
 */
async function registerLocalChatRoutes(config: Partial<Environment>, app: App): Promise<void> {
  logger.info('Registering local chat routes with streaming support');

  const chatRouter = await buildChatRouter(config);

  // Generic chat streaming endpoint
  app.post(API_ROUTES.CHAT.STREAM, async (c) => {
    logger.info('Handling generic chat stream request');

    try {
      // Create a mock APIGatewayProxyEvent from Hono context
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: API_ROUTES.CHAT.STREAM,
        body: JSON.stringify(await c.req.json()),
        requestContext: (c.env.event?.requestContext || {}) as APIGatewayProxyEvent['requestContext'],
      };

      const stream = await chatRouter.route(event as APIGatewayProxyEvent);

      // Set SSE headers
      Object.entries(SSE_HEADERS).forEach(([key, value]) => {
        c.header(key, value);
      });

      // Stream the response
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream.toUIMessageStream()) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            controller.close();
          } catch (error) {
            logger.error('Error streaming chat response', { error });
            const errorData = `data: ${JSON.stringify({ type: 'error', errorText: error instanceof Error ? error.message : 'Unknown error' })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: SSE_HEADERS,
      });
    } catch (error) {
      logger.error('Chat stream error', { error });
      return c.json({ message: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  // Session-specific chat streaming endpoint
  app.post(API_ROUTES.CHAT.SESSION_STREAM, async (c) => {
    const sessionId = c.req.param('sessionId');
    logger.info('Handling session chat stream request', { sessionId });

    try {
      // Create a mock APIGatewayProxyEvent from Hono context
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: API_ROUTES.CHAT.SESSION_STREAM.replace(':sessionId', encodeURIComponent(sessionId ?? '')),
        body: JSON.stringify(await c.req.json()),
        requestContext: (c.env.event?.requestContext || {}) as APIGatewayProxyEvent['requestContext'],
      };

      const stream = await chatRouter.route(event as APIGatewayProxyEvent);

      // Set SSE headers
      Object.entries(SSE_HEADERS).forEach(([key, value]) => {
        c.header(key, value);
      });

      // Stream the response
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream.toUIMessageStream()) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            controller.close();
          } catch (error) {
            logger.error('Error streaming session chat response', { error });
            const errorData = `data: ${JSON.stringify({ type: 'error', errorText: error instanceof Error ? error.message : 'Unknown error' })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: SSE_HEADERS,
      });
    } catch (error) {
      logger.error('Session chat stream error', { error });
      return c.json({ message: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  logger.info('Local chat routes registered successfully');
}

export function localAuthMiddleware() {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const authHeader = c.req.header('Authorization');

    // If no auth header, just continue - let individual routes handle auth requirements
    if (!authHeader) {
      return await next();
    }

    let token: string;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }

    try {
      const decoded = decodeJwt(token) as CognitoJWTPayload;

      if (!decoded?.sub || !decoded?.email) {
        logger.warn('Invalid JWT token structure');
        return c.json({ message: 'Invalid token' }, 401);
      }

      c.env.event = {
        ...c.env.event,
        requestContext: {
          ...c.env.event?.requestContext,
          authorizer: { claims: decoded },
        },
      };

      logger.debug('Successfully parsed local auth token', {
        email: decoded.email,
        userId: decoded.sub,
      });

      return await next();
    } catch (error) {
      logger.warn('Failed to decode JWT token', { error });
      return c.json({ message: 'Invalid token format' }, 401);
    }
  };
}

async function assumeRole(roleArn: string): Promise<Credentials | undefined> {
  const sts = new STSClient({ region: process.env.AWS_REGION });
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: 'dev-server',
  });
  const response = await sts.send(command);
  return response.Credentials;
}

async function prepareEnvVars(port: number): Promise<void> {
  process.env.API_BASE_URL = `http://localhost:${port}`;
  if (process.env.LAMBDA_ROLE_ARN) {
    const credentials = await assumeRole(process.env.LAMBDA_ROLE_ARN);
    if (credentials) {
      logger.info('Assumed role', { roleArn: process.env.LAMBDA_ROLE_ARN });
      process.env.AWS_ACCESS_KEY_ID = credentials.AccessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = credentials.SecretAccessKey;
      process.env.AWS_SESSION_TOKEN = credentials.SessionToken;
      delete process.env.AWS_PROFILE;
    }
  }
}

export async function run(): Promise<void> {
  const port = parseInt(process.env.PORT || process.argv[2] || '3001', 10);
  await prepareEnvVars(port);

  logger.info('Building development server...');
  const app = await buildDevApp();

  logger.info(`Starting server on http://localhost:${port}`);
  logger.info(`API documentation available at http://localhost:${port}/docs/viewer`);
  logger.info(`LLM documentation available at http://localhost:${port}/docs/llms.txt`);
  logger.info('Press Ctrl+C to stop the server');

  serve({
    fetch: app.fetch,
    port,
  });
}

run().catch(console.error);
