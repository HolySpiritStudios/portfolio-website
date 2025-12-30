import { createRoute } from '@hono/zod-openapi';
import { API_ROUTES } from '@ws-mono/shared/constants/api-routes.constant';

import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import { LambdaEvent, handle } from 'hono/aws-lambda';

import { App, errorResponses, jsonBody } from '../../common/utils/routes.util';
import { IAuthenticationController } from '../interfaces/authentication-controller.interface';
import { ltiLaunchRequestSchema } from '../models/lti-launch.model';
import { signUpRequestSchema, signUpResponseSchema } from '../models/sign-up.model';

export class AuthenticationRouter {
  private readonly handler: ReturnType<typeof handle>;

  constructor(
    private readonly controller: IAuthenticationController,
    private readonly app: App,
  ) {
    this.setupSignUp();
    this.setupLtiLaunch();

    this.handler = handle(this.app);
  }

  private setupSignUp() {
    this.app.openapi(
      createRoute({
        method: 'post',
        path: API_ROUTES.AUTH.SIGN_UP,
        tags: ['Authentication'],
        summary: 'Sign up a new user',
        description: 'Create a new user account with email and password',
        request: { body: jsonBody(signUpRequestSchema) },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: signUpResponseSchema } },
          },
          ...errorResponses,
        },
      }),
      async (c) => {
        const body = c.req.valid('json');
        const user = await this.controller.signUp(body);
        return c.json(user, 201);
      },
    );
  }

  private setupLtiLaunch() {
    this.app.openapi(
      createRoute({
        method: 'post',
        path: API_ROUTES.AUTH.LTI_LAUNCH,
        tags: ['Authentication'],
        summary: 'LTI 1.3 launch endpoint',
        description: 'Handle LTI 1.3 launch requests from learning management systems',
        request: {
          body: {
            content: { 'application/x-www-form-urlencoded': { schema: ltiLaunchRequestSchema } },
          },
        },
        responses: {
          302: {
            description: 'Redirect',
          },
          ...errorResponses,
        },
      }),
      async (c) => {
        const body = c.req.valid('form');
        const result = await this.controller.ltiLaunch(body);
        return c.redirect(result.redirectUrl, 302);
      },
    );
  }

  public route(event: APIGatewayProxyEvent | APIGatewayProxyEventV2) {
    return this.handler(event as unknown as LambdaEvent);
  }
}
