import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  CognitoUserPoolsAuthorizer,
  Cors,
  CorsOptions,
  EndpointType,
  IResource,
  IRestApi,
  LambdaIntegration,
  ResponseTransferMode,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AccountRecovery,
  IUserPool,
  IUserPoolClient,
  IUserPoolDomain,
  OAuthScope,
  ProviderAttribute,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolDomain,
  UserPoolIdentityProviderGoogle,
} from 'aws-cdk-lib/aws-cognito';
import { AttributeType, BillingMode, ITable, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  AccountPrincipal,
  CompositePrincipal,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import { getResourceName } from '../constants/app.constant';
import { isProduction } from '../constants/environment.constant';
import { getLambdaPath } from '../utils/directory.util';

const CORS_OPTIONS: CorsOptions = {
  allowOrigins: Cors.ALL_ORIGINS,
  allowMethods: Cors.ALL_METHODS,
  allowHeaders: [...Cors.DEFAULT_HEADERS, 'Authorization', 'Content-Type'],
  allowCredentials: true,
};

interface AddMethodProxyOptions {
  authType?: 'cognito' | 'iam' | 'none';
  responseTransferMode?: ResponseTransferMode;
}

export interface BackendConstructProps {
  environment: string;
  secretId: string;
  domainName: string;
  subdomainName: string;
  certificateArn: string;
  ltiIssuer?: string;
  ltiAudience?: string;
  timeBackBaseUrl?: string;
}

export class BackendConstruct extends Construct {
  public readonly api: IRestApi;
  public readonly userPool: IUserPool;
  public readonly userPoolClient: IUserPoolClient;
  public readonly userPoolDomain: IUserPoolDomain;
  public readonly table: ITable;
  public readonly lambdaRole: Role;

  private readonly secret: secretsmanager.ISecret;
  private readonly authorizer: CognitoUserPoolsAuthorizer;

  constructor(scope: Construct, id: string, props: BackendConstructProps) {
    super(scope, id);

    this.table = this.createDynamoDBTable(props);
    this.secret = secretsmanager.Secret.fromSecretNameV2(this, 'BackendSecret', props.secretId);
    this.lambdaRole = this.createUnifiedLambdaRole(props);

    const cognitoResources = this.createCognitoUserPool(props);
    this.userPool = cognitoResources.userPool;
    this.userPoolClient = cognitoResources.userPoolClient;
    this.userPoolDomain = cognitoResources.userPoolDomain;

    this.api = this.createApiGateway(props);
    this.authorizer = this.createCognitoAuthorizer(props);

    this.setupApiRoutes(props);
    this.addOutputs(props);
  }

  private createDynamoDBTable(props: BackendConstructProps): Table {
    const tableName = getResourceName(props.environment, 'backend-table');

    const table = new Table(this, 'Table', {
      tableName,
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProduction(props.environment) ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    return table;
  }

  private createUnifiedLambdaRole(props: BackendConstructProps): Role {
    const roleName = getResourceName(props.environment, 'lambda-execution-role');

    const assumedBy = isProduction(props.environment)
      ? new ServicePrincipal('lambda.amazonaws.com')
      : new CompositePrincipal(
          new ServicePrincipal('lambda.amazonaws.com'),
          new AccountPrincipal(Stack.of(this).account),
        );

    const role = new Role(this, 'UnifiedLambdaRole', {
      roleName,
      assumedBy,
      description: `Unified execution role for all backend lambdas in ${props.environment} environment`,
    });
    role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    this.table.grantReadWriteData(role);
    this.secret.grantRead(role);

    role.addToPolicy(
      new PolicyStatement({
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:ListUsers',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminConfirmSignUp',
          'cognito-idp:AdminLinkProviderForUser',
        ],
        resources: ['*'],
      }),
    );

    // Add Bedrock permissions for AI chat functionality
    role.addToPolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      }),
    );

    return role;
  }

  private createCognitoUserPool(props: BackendConstructProps): {
    userPool: UserPool;
    userPoolClient: UserPoolClient;
    userPoolDomain: UserPoolDomain;
  } {
    const userPoolName = getResourceName(props.environment, 'userpool');
    const domainPrefix = getResourceName(props.environment, 'userauth');

    const cognitoTriggerLambda = this.createLambdaFunction(props, 'cognito-trigger.lambda.ts');

    const userPool = new UserPool(this, 'UserPool', {
      userPoolName,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      signInCaseSensitive: false,
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: isProduction(props.environment) ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      lambdaTriggers: {
        preTokenGeneration: cognitoTriggerLambda,
        defineAuthChallenge: cognitoTriggerLambda,
        createAuthChallenge: cognitoTriggerLambda,
        verifyAuthChallengeResponse: cognitoTriggerLambda,
      },
    });

    const userPoolDomain = new UserPoolDomain(this, 'UserPoolDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix,
      },
    });

    let googleProvider: UserPoolIdentityProviderGoogle | undefined;
    if (props.secretId) {
      const secret = secretsmanager.Secret.fromSecretNameV2(this, 'AuthSecret', props.secretId);

      googleProvider = new UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
        userPool,
        clientId: secret.secretValueFromJson('GOOGLE_CLIENT_ID').unsafeUnwrap(),
        clientSecretValue: secret.secretValueFromJson('GOOGLE_CLIENT_SECRET'),
        scopes: ['openid', 'email', 'profile'],
        attributeMapping: {
          email: ProviderAttribute.GOOGLE_EMAIL,
          fullname: ProviderAttribute.GOOGLE_NAME,
        },
      });
    }

    const baseUrl = props.subdomainName ? `${props.subdomainName}.${props.domainName}` : props.domainName;
    const callbackUrls = [`https://${baseUrl}/`, this.getApiUrl(props, '/docs/viewer')];
    const logoutUrls = [`https://${baseUrl}/`];

    if (!isProduction(props.environment)) {
      callbackUrls.push(
        'http://localhost:3000/',
        'http://localhost:3000/docs/viewer',
        'https://oauth.pstmn.io/v1/vscode-callback',
        'https://oauth.pstmn.io/v1/browser-callback',
      );
      logoutUrls.push('http://localhost:3000/');
    }

    const supportedProviders = [UserPoolClientIdentityProvider.COGNITO];
    if (googleProvider) {
      supportedProviders.push(UserPoolClientIdentityProvider.GOOGLE);
    }

    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: getResourceName(props.environment, 'client'),
      generateSecret: false,
      authFlows: {
        adminUserPassword: false,
        userPassword: true,
        custom: true,
        userSrp: false,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
          clientCredentials: false,
        },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
        callbackUrls,
        logoutUrls,
      },
      supportedIdentityProviders: supportedProviders,
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
    });

    if (googleProvider) {
      userPoolClient.node.addDependency(googleProvider);
    }

    return { userPool, userPoolClient, userPoolDomain };
  }

  private getLambdaEnvVars(props: BackendConstructProps): Record<string, string> {
    const baseUrl = props.subdomainName ? `${props.subdomainName}.${props.domainName}` : props.domainName;
    return {
      API_BASE_URL: this.getApiUrl(props),
      ENVIRONMENT: props.environment,
      DYNAMODB_TABLE_NAME: this.table.tableName,
      USER_POOL_ID: this.userPool?.userPoolId ?? '',
      USER_POOL_DOMAIN: this.getUserPoolDomain() ?? '',
      USER_POOL_CLIENT_ID: this.userPoolClient?.userPoolClientId ?? '',
      SECRET_ID: props.secretId,
      FRONTEND_BASE_URL: `https://${baseUrl}`,
      LTI_ISSUER: props.ltiIssuer ?? '',
      LTI_JWKS_URL: props.timeBackBaseUrl ? `${props.timeBackBaseUrl}/.well-known/jwks.json` : '',
      LTI_AUDIENCE: props.ltiAudience ?? '',
      TIMEBACK_BASE_URL: props.timeBackBaseUrl ?? '',
    };
  }

  private createLambdaFunction(
    props: BackendConstructProps,
    entryPath: string,
    overrides: Partial<NodejsFunctionProps> = {},
  ): NodejsFunction {
    const name = entryPath.split('.')[0];
    const functionName = getResourceName(props.environment, name);

    const lambda = new NodejsFunction(this, name + 'Lambda', {
      functionName,
      entry: getLambdaPath(entryPath),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment: this.getLambdaEnvVars(props),
      role: this.lambdaRole,
      bundling: {
        minify: isProduction(props.environment),
        sourceMap: !isProduction(props.environment),
        bundleAwsSDK: true,
        externalModules: [],
      },
      logRetention: isProduction(props.environment) ? RetentionDays.ONE_YEAR : RetentionDays.TWO_WEEKS,
      description: `Backend API handler for ${props.environment} environment`,
      ...overrides,
    });

    return lambda;
  }

  private getApiSubdomain(props: BackendConstructProps): string {
    return props.subdomainName ? `api-${props.subdomainName}` : 'api';
  }

  private getApiUrl(props: BackendConstructProps, path = ''): string {
    return `https://${this.getApiSubdomain(props)}.${props.domainName}${path}`;
  }

  private createApiGateway(props: BackendConstructProps): RestApi {
    const apiName = getResourceName(props.environment, 'api');

    const apiSubdomain = this.getApiSubdomain(props);

    const api = new RestApi(this, 'Api', {
      restApiName: apiName,
      description: `Backend API for ${props.environment} environment`,
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      domainName: {
        domainName: `${apiSubdomain}.${props.domainName}`,
        certificate: Certificate.fromCertificateArn(this, 'ApiCertificate', props.certificateArn),
      },
    });

    const zone = HostedZone.fromLookup(this, 'ApiHostedZone', { domainName: props.domainName });
    new ARecord(this, 'ApiAliasRecord', {
      zone: zone,
      recordName: apiSubdomain,
      target: RecordTarget.fromAlias(new ApiGateway(api)),
    });

    return api;
  }

  private createCognitoAuthorizer(props: BackendConstructProps): CognitoUserPoolsAuthorizer {
    const authorizerName = getResourceName(props.environment, 'authorizer');

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      authorizerName,
      cognitoUserPools: [this.userPool],
    });

    return authorizer;
  }

  private setupApiRoutes(props: BackendConstructProps): void {
    this.api.root.addCorsPreflight(CORS_OPTIONS);

    const authenticationLambda = this.createLambdaFunction(props, 'authentication-api-handler.lambda.ts');
    const authenticationResource = this.api.root.addResource('authentication').addResource('v1').addProxy();
    this.addAllMethodProxy(authenticationResource, authenticationLambda, { authType: 'none' });

    const helloWorldLambda = this.createLambdaFunction(props, 'hello-world-api-handler.lambda.ts');
    const helloWorldResource = this.api.root.addResource('hello-world').addResource('v1').addProxy();
    this.addAllMethodProxy(helloWorldResource, helloWorldLambda, { authType: 'cognito' });

    const docsLambda = this.createLambdaFunction(props, 'docs-api-handler.lambda.ts');
    const docsResource = this.api.root.addResource('docs').addProxy();
    this.addAllMethodProxy(docsResource, docsLambda, { authType: 'none' });

    // Chat streaming routes (uses direct Lambda response streaming, not Hono)
    const chatLambda = this.createLambdaFunction(props, 'chat-api-handler.lambda.ts', { timeout: Duration.minutes(5) });
    const chatResource = this.api.root.addResource('chat').addResource('v1').addProxy();
    this.addAllMethodProxy(chatResource, chatLambda, { responseTransferMode: ResponseTransferMode.STREAM });
  }

  private addAllMethodProxy(resource: IResource, lambda: NodejsFunction, options: AddMethodProxyOptions = {}): void {
    const { authType = 'cognito', responseTransferMode } = options;
    const timeout = responseTransferMode === ResponseTransferMode.STREAM ? Duration.minutes(5) : undefined;
    ['GET', 'POST', 'PUT', 'DELETE'].forEach((method) => {
      resource.addMethod(
        method,
        new LambdaIntegration(lambda, {
          proxy: true,
          allowTestInvoke: true,
          responseTransferMode,
          timeout,
        }),
        {
          authorizer: authType === 'cognito' ? this.authorizer : undefined,
        },
      );
    });

    resource.addMethod(
      'OPTIONS',
      new LambdaIntegration(lambda, {
        proxy: true,
        allowTestInvoke: true,
      }),
    );
  }

  private getUserPoolDomain(): string | undefined {
    if (!this.userPoolDomain) {
      return undefined;
    }

    const region = this.node.tryGetContext('region') || 'us-east-1';
    return `${this.userPoolDomain.domainName}.auth.${region}.amazoncognito.com`;
  }

  private addOutputs(props: BackendConstructProps): void {
    const region = this.node.tryGetContext('region') || 'us-east-1';

    new CfnOutput(this, 'OutputLambdaEnvVars', {
      key: 'LambdaEnvVars',
      value: JSON.stringify(this.getLambdaEnvVars(props)),
      description: 'Lambda environment variables for the backend',
    });

    new CfnOutput(this, 'OutputApiEndpoint', {
      key: 'ApiUrl',
      value: this.getApiUrl(props),
      description: 'API Gateway endpoint URL',
    });

    new CfnOutput(this, 'OutputTableName', {
      key: 'TableName',
      value: this.table.tableName,
      description: 'DynamoDB table name',
    });

    new CfnOutput(this, 'OutputUserPoolId', {
      key: 'UserPoolId',
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new CfnOutput(this, 'OutputUserPoolClientId', {
      key: 'UserPoolClientId',
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new CfnOutput(this, 'OutputUserPoolRegion', {
      key: 'UserPoolRegion',
      value: region,
      description: 'Cognito User Pool Region',
    });

    new CfnOutput(this, 'OutputUserPoolDomain', {
      key: 'UserPoolDomain',
      value: this.getUserPoolDomain() ?? '',
      description: 'Cognito User Pool Domain',
    });

    new CfnOutput(this, 'OutputUserPoolAuthUrl', {
      key: 'UserPoolAuthUrl',
      value: `https://${this.userPoolDomain.domainName}.auth.${region}.amazoncognito.com/oauth2/authorize`,
      description: 'Cognito User Pool Auth URL',
    });

    new CfnOutput(this, 'OutputCognitoIssuerUrl', {
      key: 'CognitoIssuerUrl',
      value: `https://cognito-idp.${region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: 'Cognito OIDC Issuer URL',
    });

    new CfnOutput(this, 'OutputLambdaRoleArn', {
      key: 'LambdaRoleArn',
      value: this.lambdaRole.roleArn,
      description: 'ARN of the unified Lambda execution role',
    });
  }
}
