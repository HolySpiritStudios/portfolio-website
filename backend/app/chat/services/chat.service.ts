import { bedrock } from '@ai-sdk/amazon-bedrock';
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

import { ModelMessage, StreamTextResult, ToolSet, convertToModelMessages, stepCountIs, streamText, tool } from 'ai';
import { z } from 'zod';

import { AuthContext } from '../../common/models/auth-context.model';
import { getAppLogger } from '../../common/utils/logger.util';
import { IContextService } from '../interfaces/context-service.interface';
import { ChatMessage } from '../models/chat-stream.model';
import { ChatServiceConfig, CheckMCPsResult, MCPServer, MCPStatus } from '../models/mcp-server.model';

const logger = getAppLogger('chat-service');

// Default model: Claude Opus 4.5 for superior coding capabilities and complex reasoning
// Using inference profile (global.) for on-demand throughput access
export const DEFAULT_CHAT_MODEL = 'global.anthropic.claude-opus-4-5-20251101-v1:0';

export class ChatService {
  private constructor(
    private readonly mcpTools: ToolSet,
    private readonly model: string,
    private readonly isProduction: boolean,
    private readonly contextService?: IContextService,
  ) {}

  /**
   * Factory method to create ChatService with optional MCP integration
   * Supports multiple MCP servers - tools are namespaced by server to avoid conflicts
   * This allows the starter to work out-of-box without external dependencies
   */
  static async create(config: ChatServiceConfig, contextService?: IContextService): Promise<ChatService> {
    const mcpServerCount = config.mcpServers?.length ?? 0;
    const model = config.model || DEFAULT_CHAT_MODEL;
    const isProduction = config.isProduction ?? false;
    logger.info('Initializing ChatService', { mcpServerCount, hasContext: !!contextService, model, isProduction });

    const allTools: ToolSet = {};
    const mcpStatus: Record<string, MCPStatus> = {};
    let totalToolCount = 0;

    // Initialize all MCP servers - namespace tools by server URL to avoid conflicts
    if (config.mcpServers && config.mcpServers.length > 0) {
      for (let i = 0; i < config.mcpServers.length; i++) {
        const server: MCPServer = config.mcpServers[i];
        const rawServerName: string = server.name || `server${i + 1}`;
        const serverName = this.sanitizeName(rawServerName);

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
            const namespacedName = `${serverName}_${this.sanitizeName(toolName)}`;
            allTools[namespacedName] = toolDef as (typeof allTools)[string];
          }

          totalToolCount += toolCount;
          mcpStatus[serverName] = { status: 'connected', url: server.url, toolCount };

          logger.info('MCP client initialized successfully', {
            serverName,
            url: server.url,
            toolCount,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          mcpStatus[serverName] = { status: 'failed', url: server.url, error: errorMessage };

          logger.error('Failed to initialize MCP client, continuing with other servers', {
            serverName,
            url: server.url,
            error: errorMessage,
            ...(errorStack && { stack: errorStack }),
          });
          // Continue with other servers - graceful degradation
        }
      }

      // Add ad-hoc tool to check MCP health - only in non-production environments
      // Useful for debugging from chat
      if (!isProduction) {
        allTools.check_mcps = tool<unknown, CheckMCPsResult>({
          description: 'Checks the status and health of all configured MCP (Model Context Protocol) servers.',
          inputSchema: z.object({}),
          execute: async (): Promise<CheckMCPsResult> =>
            await Promise.resolve({
              message: 'Status of MCP server connections',
              servers: mcpStatus,
              totalTools: totalToolCount,
            }),
        });
      }

      logger.info('All MCP servers initialized', {
        clientCount: config.mcpServers.length,
        totalToolCount,
        namespacedToolCount: Object.keys(allTools).length,
      });
    } else {
      logger.info('No MCP servers configured, continuing without MCP tools');
    }

    return new ChatService(allTools, model, isProduction, contextService);
  }

  /**
   * Sanitizes a name to be safe for LLM tool naming (alphanumeric and underscores only)
   */
  private static sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_');
  }

  /**
   * Generic chat without session context
   * Uses default system prompt
   */
  async streamChat(authContext: AuthContext, messages: ChatMessage[]): Promise<StreamTextResult<ToolSet, undefined>> {
    const systemPrompt = await this.getSystemPrompt();
    return this.streamAssistantResponse(systemPrompt, messages, { userId: authContext.userId });
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
    const systemPrompt = await this.getSystemPrompt(sessionId, authContext);
    return this.streamAssistantResponse(systemPrompt, messages, { sessionId, userId: authContext.userId });
  }

  /**
   * Internal helper to handle the common streaming logic for both generic and session-aware chat
   */
  private streamAssistantResponse(
    systemPrompt: string,
    messages: ChatMessage[],
    logContext: Record<string, unknown>,
  ): StreamTextResult<ToolSet, undefined> {
    logger.info('Starting assistant chat stream', {
      ...logContext,
      messageCount: messages.length,
      toolCount: Object.keys(this.mcpTools).length,
      model: this.model,
    });

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
      onFinish: ({ text, finishReason, usage, reasoning }) => {
        logger.info('Stream finished', {
          ...logContext,
          finishReason,
          usage,
          textLength: text?.length || 0,
          hasReasoning: !!reasoning,
          reasoningLength: reasoning?.length || 0,
        });
        if (reasoning) {
          logger.info('Reasoning content', { ...logContext, reasoning });
        }
      },
    });
  }

  /**
   * Build the system prompt, optionally with session-specific context
   */
  private async getSystemPrompt(sessionId?: string, authContext?: AuthContext): Promise<string> {
    const checkMcpsInstruction = this.isProduction
      ? ''
      : "\nIf you expect a tool to be available but it isn't, or if you encounter issues with tools, you can use the 'check_mcps' tool to see the status of all configured MCP server connections.";

    const basePrompt = `You are a helpful AI assistant. Provide clear, concise, and accurate responses.
If you have access to tools, use them when appropriate to help the user.${checkMcpsInstruction}`;

    if (!sessionId || !authContext || !this.contextService) {
      return basePrompt;
    }

    try {
      const context = await this.contextService.getContext(sessionId, authContext);
      return `You are a helpful AI assistant.

<context>
${context}
</context>

Use the context above to provide relevant and personalized responses.
${basePrompt}`;
    } catch (error) {
      logger.error('Failed to build contextual prompt, using default', { sessionId, error });
      return basePrompt;
    }
  }
}
