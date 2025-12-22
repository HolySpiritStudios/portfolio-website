import { ChatController } from '../../app/chat/controllers/chat.controller';
import { ChatRouter } from '../../app/chat/routers/chat.router';
import { ChatService } from '../../app/chat/services/chat.service';
import { SecretsService } from '../../app/common/integrations/aws/services/secrets.service';
import { Environment, EnvironmentService, EnvironmentVariable } from '../../app/common/utils/environment.util';
import { getAppLogger } from '../../app/common/utils/logger.util';

const logger = getAppLogger('chat-service-container');

interface ChatSecrets {
  // Optional MCP configuration
  MCP_URL?: string;
  MCP_API_KEY?: string;

  // Example: Short.io MCP integration
  // If SHORTIO_API_KEY is provided, it will be used with Short.io's MCP server
  SHORTIO_API_KEY?: string;
}

// Short.io MCP server URL - used as fallback example when SHORTIO_API_KEY is provided
const SHORTIO_MCP_URL = 'https://ai-assistant.short.io/mcp';

/**
 * Build ChatRouter with all dependencies
 * MCP integration is optional - works in multiple ways:
 * 1. If MCP_URL + MCP_API_KEY are provided, uses those (generic approach)
 * 2. If only SHORTIO_API_KEY is provided, uses Short.io MCP server
 * 3. If none provided, chat works without MCP tools
 *
 * ContextService is optional - can be injected for domain-specific context
 */
export async function buildChatRouter(config: Partial<Environment> = {}): Promise<ChatRouter> {
  logger.info('Building chat router');

  const environmentService = new EnvironmentService(config);
  const secretsService = new SecretsService(environmentService);

  const secretId = environmentService.get(EnvironmentVariable.SECRET_ID);
  const secrets = await secretsService.getSecret<ChatSecrets>(secretId);

  // Determine MCP configuration (supports both generic and Short.io-specific)
  const mcpUrl = secrets.MCP_URL || (secrets.SHORTIO_API_KEY ? SHORTIO_MCP_URL : undefined);
  const mcpApiKey = secrets.MCP_API_KEY || secrets.SHORTIO_API_KEY;

  // Optional: Implement ContextService here for session-specific context
  // Example:
  // const contextService = new SessionContextService(...);
  // const chatService = await ChatService.create({ ... }, contextService);

  const chatService = await ChatService.create({
    mcpUrl,
    mcpApiKey,
  });

  const chatController = new ChatController(chatService);

  logger.info('Chat router built successfully', { hasMCP: !!mcpUrl });
  return new ChatRouter(chatController);
}
