import { OpenAPIHono, z } from '@hono/zod-openapi';

import type { Context } from 'hono';
import type { LambdaContext, LambdaEvent } from 'hono/aws-lambda';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';

import { EnvironmentService, EnvironmentVariable } from './environment.util';
import { InvalidArgumentsError, NotFoundError } from './errors';
import { getAppLogger } from './logger.util';

const logger = getAppLogger('hono-error-handler');

interface Bindings {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
}

export type App = OpenAPIHono<{ Bindings: Bindings }>;

export class RoutesService {
  constructor(private readonly env: EnvironmentService) {}

  getOpenApiMetadata(openapiVersion: '3.0.0' | '3.1.0' = '3.0.0') {
    const apiBaseUrl = this.env.get(EnvironmentVariable.API_BASE_URL);
    return {
      openapi: openapiVersion,
      info: {
        title: `WS.Eng Monorepo Starter API`,
        version: '1.0.0',
        description: 'This API provides functionality for the WS.Eng Monorepo Starter.',
      },
      tags: [
        { name: 'Authentication', description: 'User authentication and authorization endpoints' },
        { name: 'Chat', description: 'AI chat streaming endpoints (handled by Lambda streaming)' },
        { name: 'HelloWorld', description: 'Hello World endpoints' },
      ],
      servers: [{ url: apiBaseUrl }],
    };
  }

  getCognitoAuthorizationCodeFlow() {
    const cognitoDomain = this.env.get(EnvironmentVariable.USER_POOL_DOMAIN);
    return {
      authorizationUrl: `https://${cognitoDomain}/oauth2/authorize`,
      tokenUrl: `https://${cognitoDomain}/oauth2/token`,
      scopes: {
        openid: 'OpenID',
      },
    };
  }

  buildApp(): App {
    const app = new OpenAPIHono<{ Bindings: Bindings }>();
    app.doc('/docs/openapi.json', this.getOpenApiMetadata());

    app.openAPIRegistry.registerComponent('securitySchemes', 'cognito', {
      type: 'oauth2',
      scheme: 'bearer',
      in: 'header',
      bearerFormat: 'JWT',
      flows: {
        authorizationCode: this.getCognitoAuthorizationCodeFlow(),
      },
    });

    app.use(
      '*',
      cors({
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        origin: '*',
      }),
    );
    app.onError(errorHandler);
    app.notFound((c) => errorHandler(new NotFoundError(`Not found path: ${c.req.path}`), c));
    return app;
  }
}

export function errorHandler(error: Error, c: Context): Response | Promise<Response> {
  if (error instanceof ZodError) {
    logger.error('Invalid request body', { errors: error.errors });
    return c.json(
      {
        message: 'Invalid request body',
        errors: error.errors,
      },
      400,
    );
  }

  if (error instanceof InvalidArgumentsError) {
    logger.error('Invalid arguments', { error });
    return c.json(
      {
        message: error.message,
      },
      400,
    );
  }

  if (error instanceof NotFoundError) {
    logger.error('Not found', { error });
    return c.json(
      {
        message: error.message,
      },
      404,
    );
  }

  logger.error('Internal server error', { error });
  return c.json(
    {
      message: 'Internal server error',
    },
    500,
  );
}

export const errorResponses = {
  400: {
    description: 'Bad Request',
    content: {
      'application/json': { schema: z.object({ message: z.string() }) },
    },
  },
  401: {
    description: 'Unauthorized',
    content: {
      'application/json': { schema: z.object({ message: z.string() }) },
    },
  },
  404: {
    description: 'Not Found',
    content: {
      'application/json': { schema: z.object({ message: z.string() }) },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': { schema: z.object({ message: z.string() }) },
    },
  },
};

export const createdResponse = <T extends z.ZodTypeAny>(schema: T) => ({
  201: {
    description: 'Created',
    content: {
      'application/json': { schema },
    },
  },
});

export const successResponse = <T extends z.ZodTypeAny>(schema: T) => ({
  200: {
    description: 'Success',
    content: {
      'application/json': { schema },
    },
  },
});

export const noContentResponse = {
  204: {
    description: 'No Content',
  },
};

export const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  content: {
    'application/json': { schema },
  },
});
