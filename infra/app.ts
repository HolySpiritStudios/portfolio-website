#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';

import { getResourceName } from './constants/app.constant';
import { isEphemeral } from './constants/environment.constant';
import { InfraStack } from './stacks/infra.stack';

dotenvConfig({ path: path.resolve(__dirname, '../.env') });

const app = new cdk.App();
const inputEnv = process.env.ENVIRONMENT?.toString() || 'integration';

if (inputEnv === 'integration') {
  new InfraStack(app, 'IntegrationStack', {
    stackName: getResourceName('integration', 'stack'),
    environment: 'integration',
    secretId: 'portfolio/backend/integration/secrets',
    domainName: 'wseng.rp.devfactory.com',
    subdomainName: 'monorepo-integration',
    certificateArn: 'arn:aws:acm:us-east-1:856284715153:certificate/2c7230dd-9ebd-4eb8-be80-c6d9d97770d1',
    sentryDsn: process.env.SENTRY_DSN,
    ltiIssuer: 'https://staging.timeback.com',
    ltiAudience: 'portfolio',
    timeBackBaseUrl: 'https://platform.dev.timeback.com',
    env: { account: '856284715153', region: 'us-east-1' },
  });
} else if (isEphemeral(inputEnv)) {
  const environmentName = inputEnv.toLowerCase();
  new InfraStack(app, 'EphemeralStack', {
    stackName: getResourceName(environmentName, 'stack'),
    environment: environmentName,
    secretId: 'portfolio/backend/integration/secrets',
    domainName: 'wseng.rp.devfactory.com',
    subdomainName: `monorepo-` + environmentName,
    certificateArn: 'arn:aws:acm:us-east-1:856284715153:certificate/2c7230dd-9ebd-4eb8-be80-c6d9d97770d1',
    sentryDsn: process.env.SENTRY_DSN,
    ltiIssuer: 'https://staging.timeback.com',
    ltiAudience: 'portfolio',
    timeBackBaseUrl: 'https://platform.dev.timeback.com',
    env: { account: '856284715153', region: 'us-east-1' },
  });
} else {
  new InfraStack(app, 'ProductionStack', {
    stackName: getResourceName('production', 'stack'),
    environment: 'production',
    secretId: 'portfolio/backend/production/secrets',
    domainName: 'wseng.rp.devfactory.com',
    subdomainName: 'monorepo',
    certificateArn: 'arn:aws:acm:us-east-1:856284715153:certificate/2c7230dd-9ebd-4eb8-be80-c6d9d97770d1',
    sentryDsn: process.env.SENTRY_DSN,
    ltiIssuer: 'https://timeback.com',
    ltiAudience: 'portfolio',
    timeBackBaseUrl: 'https://platform.timeback.com',
    env: { account: '856284715153', region: 'us-east-1' },
  });
}
