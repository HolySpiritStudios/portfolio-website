import { AssumeRoleCommand, Credentials, STSClient } from '@aws-sdk/client-sts';
import { serve } from '@hono/node-server';

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
import { buildHelloWorldRouter } from '../entrypoints/containers/hello-world-router.container';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

export async function buildDevApp(config: Partial<Environment> = {}): Promise<App> {
  const environmentService = new EnvironmentService(config);
  const routesService = new RoutesService(environmentService);

  const app = routesService.buildApp();
  app.use('*', localAuthMiddleware());

  await buildAuthenticationRouter(config, app);
  await buildHelloWorldRouter(config, app);

  // Register chat routes for OpenAPI generation
  // Note: Actual streaming is handled by Lambda, these are for docs only
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
  const port = parseInt(process.env.PORT || process.argv[2] || '3000', 10);
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
