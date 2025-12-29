import { z } from 'zod';

import { getAppLogger } from './logger.util';

export enum EnvironmentVariable {
  // Core
  ENVIRONMENT = 'ENVIRONMENT',
  API_BASE_URL = 'API_BASE_URL',

  // AWS
  _X_AMZN_TRACE_ID = '_X_AMZN_TRACE_ID',
  AWS_REGION = 'AWS_REGION',

  // DynamoDB
  DYNAMODB_TABLE_NAME = 'DYNAMODB_TABLE_NAME',

  // Cognito
  USER_POOL_ID = 'USER_POOL_ID',
  USER_POOL_CLIENT_ID = 'USER_POOL_CLIENT_ID',
  USER_POOL_DOMAIN = 'USER_POOL_DOMAIN',

  // Secrets
  SECRET_ID = 'SECRET_ID',

  // LTI / Magic Link
  FRONTEND_BASE_URL = 'FRONTEND_BASE_URL',
  LTI_ISSUER = 'LTI_ISSUER',
  LTI_JWKS_URL = 'LTI_JWKS_URL',
  LTI_AUDIENCE = 'LTI_AUDIENCE',

  // TimeBack
  TIMEBACK_BASE_URL = 'TIMEBACK_BASE_URL',

  // Chat
  CHAT_MODEL = 'CHAT_MODEL',
}

const CoreEnvironmentSchema = z.object({
  [EnvironmentVariable.ENVIRONMENT]: z.string().min(3),
  [EnvironmentVariable.API_BASE_URL]: z.string().url(),
});

const AwsEnvironmentSchema = z.object({
  [EnvironmentVariable._X_AMZN_TRACE_ID]: z.string().optional(),
  [EnvironmentVariable.AWS_REGION]: z.string().optional(),
});

const DatabaseEnvironmentSchema = z.object({
  [EnvironmentVariable.DYNAMODB_TABLE_NAME]: z.string().optional(),
});

const CognitoEnvironmentSchema = z.object({
  [EnvironmentVariable.USER_POOL_ID]: z.string().optional(),
  [EnvironmentVariable.USER_POOL_CLIENT_ID]: z.string().optional(),
  [EnvironmentVariable.USER_POOL_DOMAIN]: z.string().optional(),
});

const SecretsEnvironmentSchema = z.object({
  [EnvironmentVariable.SECRET_ID]: z.string().optional(),
});

const LtiEnvironmentSchema = z.object({
  [EnvironmentVariable.FRONTEND_BASE_URL]: z.string().url().optional(),
  [EnvironmentVariable.LTI_ISSUER]: z.string().optional(),
  [EnvironmentVariable.LTI_JWKS_URL]: z.string().url().optional(),
  [EnvironmentVariable.LTI_AUDIENCE]: z.string().optional(),
});

const TimeBackEnvironmentSchema = z.object({
  [EnvironmentVariable.TIMEBACK_BASE_URL]: z.string().url().optional(),
});

const ChatEnvironmentSchema = z.object({
  [EnvironmentVariable.CHAT_MODEL]: z.string().optional(),
});

const EnvironmentSchema = CoreEnvironmentSchema.merge(AwsEnvironmentSchema)
  .merge(DatabaseEnvironmentSchema)
  .merge(CognitoEnvironmentSchema)
  .merge(SecretsEnvironmentSchema)
  .merge(LtiEnvironmentSchema)
  .merge(TimeBackEnvironmentSchema)
  .merge(ChatEnvironmentSchema);

export type Environment = z.infer<typeof EnvironmentSchema>;
type EnvironmentKey = keyof Environment;
type EnvironmentValue = Exclude<Environment[EnvironmentKey], null | undefined>;

export class EnvironmentService {
  private readonly config: Environment;
  private readonly logger = getAppLogger(EnvironmentService.name);

  constructor(partialConfig: Partial<Environment> = {}) {
    this.config = this.loadConfig(partialConfig);
  }

  private loadConfig(partialConfig: Partial<Environment> = {}): Environment {
    const parsedConfig = EnvironmentSchema.parse({ ...process.env, ...partialConfig });
    return parsedConfig;
  }

  public get(key: EnvironmentVariable): EnvironmentValue {
    const value = this.config[key];
    if (!value) {
      this.logger.error(`Missing environment variable: ${key}`);
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
  }

  public getOptional(key: EnvironmentVariable): EnvironmentValue | undefined {
    return this.config[key];
  }

  public isProduction(): boolean {
    const environment = this.get(EnvironmentVariable.ENVIRONMENT);
    return environment === 'production';
  }
}
