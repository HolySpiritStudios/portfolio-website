import { EnvironmentService, EnvironmentVariable } from '../utils/environment.util';
import { type App, RoutesService } from '../utils/routes.util';

export class DocsRouter {
  private constructor(
    private readonly environmentService: EnvironmentService,
    private readonly routesService: RoutesService,
    private readonly app: App,
  ) {}

  static async create(
    environmentService: EnvironmentService,
    routesService: RoutesService,
    app: App,
  ): Promise<DocsRouter> {
    const router = new DocsRouter(environmentService, routesService, app);
    await router.registerRoutes();
    return router;
  }

  private async registerRoutes(): Promise<void> {
    const { Scalar } = await import('@scalar/hono-api-reference');
    const { createMarkdownFromOpenApi } = await import('@scalar/openapi-to-markdown');

    this.app.get(
      '/docs/viewer',
      Scalar({
        url: 'openapi.json',
        pageTitle: 'Portfolio Website API',
        authentication: {
          preferredSecurityScheme: 'cognito',
          securitySchemes: {
            cognito: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  ...this.routesService.getCognitoAuthorizationCodeFlow(),
                  selectedScopes: ['openid'],
                  'x-scalar-client-id': this.environmentService.get(EnvironmentVariable.USER_POOL_CLIENT_ID),
                  'x-usePkce': 'SHA-256',
                  'x-tokenName': 'id_token',
                },
              },
            },
          },
        },
      }),
    );

    this.app.get('/docs/llms.txt', async (c) => {
      const content = this.app.getOpenAPI31Document(this.routesService.getOpenApiMetadata('3.1.0'));
      const markdown = await createMarkdownFromOpenApi(JSON.stringify(content));
      return c.text(markdown);
    });
  }
}
