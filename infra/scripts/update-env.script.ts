import { waitUntilStackExists } from '@aws-sdk/client-cloudformation';

import { config as dotenvConfig } from 'dotenv';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'node:path';

import { getResourceName } from '../constants/app.constant';
import { CloudFormationService } from '../integrations/cloudformation.service';
import { SecretsManagerService } from '../integrations/secrets-manager.service';
import { getInfraLogger } from '../utils/logger.util';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const logger = getInfraLogger('update-env');

// Keys we never write to .env
const EXCLUDED_ENV_VARS = new Set(['LOG_LEVEL', 'AWS_REGION', 'AWS_ACCOUNT_ID']);
const OUTPUTS_TO_ENV_VARS = new Map<string, string>([['LambdaRoleArn', 'LAMBDA_ROLE_ARN']]);
const WHITELISTED_SECRET_KEYS = new Set(['SENTRY_DSN', 'MIXPANEL_TOKEN']);

function loadDotEnvFile(dotenvPath: string): string[] {
  if (!existsSync(dotenvPath)) {
    return [];
  }
  const content = readFileSync(dotenvPath, 'utf8');
  return content.split(/\r?\n/);
}

function saveDotEnvFile(dotenvPath: string, lines: string[]): void {
  const normalized = lines.join('\n');
  writeFileSync(dotenvPath, normalized.endsWith('\n') ? normalized : normalized + '\n', 'utf8');
}

function writeToGitHubActions(entries: Record<string, string>): void {
  const githubEnv = process.env.GITHUB_ENV;
  const githubOutput = process.env.GITHUB_OUTPUT;

  const filteredEntries = Object.entries(entries).filter(([key]) => !EXCLUDED_ENV_VARS.has(key));

  if (githubEnv && existsSync(githubEnv)) {
    const content = filteredEntries.map(([key, value]) => `${key}=${value}`).join('\n');
    appendFileSync(githubEnv, content + '\n', 'utf8');
    logger.info('Wrote variables to GITHUB_ENV');
  }

  if (githubOutput && existsSync(githubOutput)) {
    const content = filteredEntries.map(([key, value]) => `${key}=${value}`).join('\n');
    appendFileSync(githubOutput, content + '\n', 'utf8');
    logger.info('Wrote variables to GITHUB_OUTPUT');
  }
}

function upsertEnvLines(lines: string[], entries: Record<string, string>): string[] {
  const keyToIndex = new Map<string, number>();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = /^([A-Z0-9_]+)\s*=/.exec(line);
    if (match) {
      keyToIndex.set(match[1], i);
    }
  }

  const updates: string[] = [];
  const additions: string[] = [];

  Object.entries(entries)
    .filter(([key]) => !EXCLUDED_ENV_VARS.has(key))
    .forEach(([key, value]) => {
      const serialized = `${key}=${value}`;
      const idx = keyToIndex.get(key);
      if (idx !== undefined) {
        if (lines[idx] !== serialized) {
          lines[idx] = serialized;
          updates.push(key);
        }
      } else {
        additions.push(serialized);
      }
    });

  if (additions.length > 0) {
    if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
      lines.push('');
    }
    lines.push(...additions);
  }

  if (updates.length > 0) {
    logger.info('Updated existing .env keys', { keys: updates });
  }
  if (additions.length > 0) {
    logger.info('Appended new .env keys', { keys: additions.map((l) => l.split('=')[0]) });
  }

  return lines;
}

async function appendLambdaEnvToDotEnv(env: string, waitMinutes?: number): Promise<void> {
  const cloudFormation = new CloudFormationService();
  const stackName = getResourceName(env, 'stack');

  if (waitMinutes !== undefined) {
    const maxWaitTime = waitMinutes * 60;
    logger.info(`Waiting for stack ${stackName} to exist (up to ${waitMinutes} minutes)...`);
    try {
      await waitUntilStackExists(
        {
          client: cloudFormation.getClient(),
          maxWaitTime,
          minDelay: 5,
          maxDelay: 30,
        },
        { StackName: stackName },
      );
      logger.info(`Stack ${stackName} exists.`);
    } catch (error) {
      logger.error(`Stack ${stackName} did not appear within ${waitMinutes} minutes.`, { error });
      throw error;
    }
  }

  const extraKeys = Array.from(OUTPUTS_TO_ENV_VARS.keys());
  const outputs = await cloudFormation.getOutputsByKey(stackName, ['LambdaEnvVars', ...extraKeys]);
  const rawJson = outputs.LambdaEnvVars;
  if (!rawJson) {
    throw new Error('LambdaEnvVars output not found in stack outputs');
  }

  let parsed: Record<string, string> = {};
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    logger.error('Failed to parse LambdaEnvVars JSON', { error });
    throw error;
  }

  for (const [outputKey, envKey] of OUTPUTS_TO_ENV_VARS.entries()) {
    const output = outputs[outputKey];
    if (output) {
      parsed[envKey] = output;
    }
  }

  const secretId = parsed.SECRET_ID;
  if (secretId) {
    logger.info('Reading secrets from Secrets Manager', { secretId });
    const secretsManager = new SecretsManagerService();
    const secrets = await secretsManager.getSecretAsJson<Record<string, string>>(secretId);
    if (secrets) {
      const whitelistedSecrets = Object.entries(secrets)
        .filter(([key]) => WHITELISTED_SECRET_KEYS.has(key))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      Object.assign(parsed, whitelistedSecrets);
      logger.info('Added whitelisted secrets to .env', { keys: Object.keys(whitelistedSecrets) });
    } else {
      logger.warn('Secret not found in Secrets Manager', { secretId });
    }
  }

  parsed.ENVIRONMENT = env;

  // Write to .env
  const dotenvPath = path.resolve(__dirname, '../../.env');
  const lines = loadDotEnvFile(dotenvPath);
  const updated = upsertEnvLines(lines, parsed);
  saveDotEnvFile(dotenvPath, updated);
  logger.info('✅ .env updated from LambdaEnvVars');

  // Write to GitHub Actions
  writeToGitHubActions(parsed);
}

function getEnv(args: Record<string, string>): string {
  if (args.pr) {
    return 'pr' + args.pr.padStart(4, '0');
  }
  return args.env || process.env.ENVIRONMENT || 'integration';
}

export async function run(args: Record<string, string>): Promise<void> {
  const env = getEnv(args);
  let waitMinutes: number | undefined;
  const defaultWaitMinutes = 30;

  if ('wait' in args) {
    const waitValue = args.wait;
    if (!waitValue) {
      waitMinutes = defaultWaitMinutes;
    } else {
      waitMinutes = parseInt(waitValue, 10);
      if (isNaN(waitMinutes)) {
        waitMinutes = defaultWaitMinutes;
      }
    }
  }

  await appendLambdaEnvToDotEnv(env, waitMinutes);
  logger.info('✅ Update env script succeeded');
}
