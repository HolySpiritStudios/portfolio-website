import { bedrock } from '@ai-sdk/amazon-bedrock';
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

import type { ToolSet } from 'ai';
import { ModelMessage, StreamTextResult, convertToModelMessages, stepCountIs, streamText } from 'ai';

import { AuthContext } from '../../common/models/auth-context.model';
import { getAppLogger } from '../../common/utils/logger.util';
import { IContextService } from '../interfaces/context-service.interface';
import { ChatMessage } from '../models/chat-stream.model';
import { ChatServiceConfig, MCPServer } from '../models/mcp-server.model';

const logger = getAppLogger('chat-service');

// Default model: Claude Opus 4.5 for superior coding capabilities and complex reasoning
// Using inference profile (global.) for on-demand throughput access
const DEFAULT_MODEL = 'global.anthropic.claude-opus-4-5-v1:0';

export class ChatService {
  private constructor(
    private readonly mcpTools: ToolSet,
    private readonly model: string,
    private readonly contextService?: IContextService,
  ) {}

  /**
   * Factory method to create ChatService with optional MCP integration
   * Supports multiple MCP servers - tools are namespaced by server to avoid conflicts
   * This allows the starter to work out-of-box without external dependencies
   */
  static async create(config: ChatServiceConfig, contextService?: IContextService): Promise<ChatService> {
    const mcpServerCount = config.mcpServers?.length ?? 0;
    const model = config.model || DEFAULT_MODEL;
    logger.info('Initializing ChatService', { mcpServerCount, hasContext: !!contextService, model });

    const allTools: ToolSet = {};
    let totalToolCount = 0;

    // Initialize all MCP servers - namespace tools by server URL to avoid conflicts
    if (config.mcpServers && config.mcpServers.length > 0) {
      for (let i = 0; i < config.mcpServers.length; i++) {
        const server: MCPServer = config.mcpServers[i];
        const serverName: string = server.name || `server${i + 1}`;

        try {
          logger.info('Initializing MCP client', { serverName, url: server.url, headerName: server.auth.headerName });
          const mcpClient = await createMCPClient({
            transport: {
              type: 'http',
              url: server.url,
              headers: { [server.auth.headerName]: server.auth.value },
            },
          });
          const serverTools = (await mcpClient.tools()) as ToolSet;
          const toolCount = Object.keys(serverTools as Record<string, unknown>).length;

          // Namespace tools to prevent conflicts: tool_name -> serverName_tool_name
          for (const [toolName, toolDef] of Object.entries(serverTools as Record<string, unknown>)) {
            const namespacedName = `${serverName}_${toolName}`;
            allTools[namespacedName] = toolDef as (typeof allTools)[string];
          }

          totalToolCount += toolCount;
          logger.info('MCP client initialized successfully', {
            serverName,
            url: server.url,
            toolCount,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          logger.error('Failed to initialize MCP client, continuing with other servers', {
            serverName,
            url: server.url,
            error: errorMessage,
            ...(errorStack && { stack: errorStack }),
          });
          // Continue with other servers - graceful degradation
        }
      }
      logger.info('All MCP servers initialized', {
        clientCount: config.mcpServers.length,
        totalToolCount,
        namespacedToolCount: Object.keys(allTools).length,
      });
    } else {
      logger.info('No MCP servers configured, continuing without MCP tools');
    }

    return new ChatService(allTools, model, contextService);
  }

  /**
   * Generic chat without session context
   * Uses default system prompt
   */
  streamChat(authContext: AuthContext, messages: ChatMessage[]): StreamTextResult<ToolSet, undefined> {
    logger.info('Starting generic chat stream', {
      userId: authContext.userId,
      messageCount: messages.length,
      toolCount: Object.keys(this.mcpTools).length,
      model: this.model,
    });

    const systemPrompt = this.getDefaultPrompt();
    const modelMessages: ModelMessage[] = convertToModelMessages(messages);

    return streamText({
      model: bedrock(this.model),
      system: systemPrompt,
      messages: modelMessages,
      tools: this.mcpTools,
      maxOutputTokens: 1024 * 4,
      stopWhen: stepCountIs(10),
      providerOptions: {
        bedrock: {
          reasoningConfig: {
            type: 'enabled',
            budgetTokens: 1024 * 2,
          },
        },
      },
    });
  }

  /**
   * Contextual chat with session-specific information
   * Uses ContextService to enrich system prompt with domain data
   */
  async streamSessionChat(
    sessionId: string,
    authContext: AuthContext,
    messages: ChatMessage[],
  ): Promise<StreamTextResult<ToolSet, undefined>> {
    logger.info('Starting session chat stream', {
      sessionId,
      userId: authContext.userId,
      messageCount: messages.length,
      toolCount: Object.keys(this.mcpTools).length,
      model: this.model,
    });

    const systemPrompt = this.contextService
      ? await this.buildContextualPrompt(sessionId, authContext)
      : this.getDefaultPrompt();

    const modelMessages: ModelMessage[] = convertToModelMessages(messages);

    return streamText({
      model: bedrock(this.model),
      system: systemPrompt,
      messages: modelMessages,
      tools: this.mcpTools,
      maxOutputTokens: 1024 * 4,
      stopWhen: stepCountIs(10),
      providerOptions: {
        bedrock: {
          reasoningConfig: {
            type: 'enabled',
            budgetTokens: 1024 * 2,
          },
        },
      },
    });
  }

  /**
   * Build contextual prompt using injected ContextService
   * Falls back to default prompt if service not available
   */
  private async buildContextualPrompt(sessionId: string, authContext: AuthContext): Promise<string> {
    if (!this.contextService) {
      return this.getDefaultPrompt();
    }

    try {
      const context = await this.contextService.getContext(sessionId, authContext);
      return `You are a helpful AI assistant.

<context>
${context}
</context>

Use the context above to provide relevant and personalized responses.`;
    } catch (error) {
      logger.error('Failed to build contextual prompt, using default', { sessionId, error });
      return this.getDefaultPrompt();
    }
  }

  /**
   * Default system prompt for generic chat
   */
  private getDefaultPrompt(): string {
    return `You are a helpful AI assistant. Provide clear, concise, and accurate responses. If you have access to tools, use them when appropriate to help the user.`;
  }
}
