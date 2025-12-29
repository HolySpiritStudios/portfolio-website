import { ChatController } from '../../app/chat/controllers/chat.controller';
import { MCPServer } from '../../app/chat/models/mcp-server.model';
import { ChatRouter } from '../../app/chat/routers/chat.router';
import { ChatService, DEFAULT_CHAT_MODEL } from '../../app/chat/services/chat.service';
import { SecretsService } from '../../app/common/integrations/aws/services/secrets.service';
import { Environment, EnvironmentService, EnvironmentVariable } from '../../app/common/utils/environment.util';
import { getAppLogger } from '../../app/common/utils/logger.util';

const logger = getAppLogger('chat-service-container');

interface ChatSecrets {
  /**
   * MCP_SERVERS: JSON array of MCP server configurations
   * Format: JSON array of objects with name, url, and auth properties
   *
   * Example:
   * [
   *   {
   *     "name": "shortio",
   *     "url": "https://ai-assistant.short.io/mcp",
   *     "auth": {
   *       "headerName": "authorization",
   *       "value": "sk_xxx"
   *     }
   *   },
   *   {
   *     "name": "github",
   *     "url": "https://api2.com/mcp",
   *     "auth": {
   *       "headerName": "x-api-key",
   *       "value": "Bearer ghp_xxx"
   *     }
   *   }
   * ]
   *
   * Note: 'name' is optional and will default to "server1", "server2", etc. if omitted
   */
  MCP_SERVERS?: string;

  /**
   * CHAT_MODEL: Optional Bedrock model ID to use for chat
   * Examples:
   * - "global.anthropic.claude-opus-4-5-20251101-v1:0" (default, best for complex reasoning)
   * - "global.anthropic.claude-sonnet-4-20250514-v1:0" (faster, more cost-effective)
   * If not specified, defaults to Claude Opus 4.5
   */
  CHAT_MODEL?: string;
}

/**
 * Parse JSON array of MCP servers from secrets
 * Format: JSON array of objects with name, url, and auth properties
 * - name: Optional server name for namespacing (defaults to "server1", "server2", etc.)
 * - url: MCP server URL
 * - auth: Object with headerName and value properties
 *
 * Example:
 * [
 *   {
 *     "name": "shortio",
 *     "url": "https://ai-assistant.short.io/mcp",
 *     "auth": { "headerName": "authorization", "value": "sk_xxx" }
 *   }
 * ]
 */
function parseMCPServers(mcpServersString?: string): MCPServer[] {
  if (!mcpServersString || mcpServersString.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(mcpServersString);

    if (!Array.isArray(parsed)) {
      logger.warn('MCP_SERVERS must be a JSON array, skipping', { type: typeof parsed });
      return [];
    }

    const servers: MCPServer[] = [];

    parsed.forEach((item, index) => {
      // Validate required fields
      if (!item || typeof item !== 'object') {
        logger.warn('Invalid MCP server entry (not an object), skipping', { index, item });
        return;
      }

      if (!item.url || typeof item.url !== 'string') {
        logger.warn('Invalid MCP server entry (missing or invalid url), skipping', { index, item });
        return;
      }

      if (!item.auth || typeof item.auth !== 'object') {
        logger.warn('Invalid MCP server entry (missing or invalid auth), skipping', { index, item });
        return;
      }

      if (!item.auth.headerName || typeof item.auth.headerName !== 'string') {
        logger.warn('Invalid MCP server entry (missing or invalid auth.headerName), skipping', { index, item });
        return;
      }

      if (!item.auth.value || typeof item.auth.value !== 'string') {
        logger.warn('Invalid MCP server entry (missing or invalid auth.value), skipping', { index, item });
        return;
      }

      // Build server object with optional name
      const server: MCPServer = {
        url: item.url.trim(),
        auth: {
          headerName: item.auth.headerName.trim(),
          value: item.auth.value.trim(),
        },
        name: item.name && typeof item.name === 'string' ? item.name.trim() : `server${index + 1}`,
      };

      servers.push(server);
    });

    return servers;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to parse MCP_SERVERS JSON, skipping MCP integration', { error: errorMessage });
    return [];
  }
}

/**
 * Build ChatRouter with all dependencies
 *
 * MCP Integration:
 * - Supports multiple MCP servers via JSON array in MCP_SERVERS secret
 * - Format: JSON array of objects with name, url, and auth properties
 * - Tools are namespaced by server name to prevent conflicts
 * - Example: [{"name":"shortio","url":"https://api1.com/mcp","auth":{"headerName":"authorization","value":"key1"}}]
 * - Chat works without MCP if not configured (graceful degradation)
 *
 * Model Configuration:
 * - Optional CHAT_MODEL secret or environment variable to override the default model
 * - Defaults to Claude Opus 4.5 if not specified
 * - Example: "global.anthropic.claude-sonnet-4-20250514-v1:0" for cost optimization
 *
 * ContextService is optional - can be injected for domain-specific context
 */
export async function buildChatRouter(config: Partial<Environment> = {}): Promise<ChatRouter> {
  logger.info('Building chat router');

  const environmentService = new EnvironmentService(config);
  const secretsService = new SecretsService(environmentService);

  const secretId = environmentService.get(EnvironmentVariable.SECRET_ID);
  const secrets = await secretsService.getSecret<ChatSecrets>(secretId);

  const mcpServers = parseMCPServers(secrets.MCP_SERVERS);
  const model =
    environmentService.getOptional(EnvironmentVariable.CHAT_MODEL) || secrets.CHAT_MODEL || DEFAULT_CHAT_MODEL;

  // Debug: Log parsed servers (mask API keys for security)
  if (mcpServers.length > 0) {
    logger.info('Parsed MCP servers', {
      count: mcpServers.length,
      servers: mcpServers.map((s) => ({
        name: s.name,
        url: s.url,
        headerName: s.auth.headerName,
        hasApiKey: !!s.auth.value,
        apiKeyLength: s.auth.value?.length || 0,
      })),
    });
  }

  // Optional: Implement ContextService here for session-specific context
  // Example:
  // const contextService = new SessionContextService(...);
  // const chatService = await ChatService.create({ mcpServers, model: secrets.CHAT_MODEL }, contextService);

  const chatService = await ChatService.create({
    mcpServers,
    model,
  });

  const chatController = new ChatController(chatService);

  logger.info('Chat router built successfully', { mcpServerCount: mcpServers.length, model });
  return new ChatRouter(chatController);
}
