import { bedrock } from '@ai-sdk/amazon-bedrock';
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

import type { ToolSet } from 'ai';
import { ModelMessage, StreamTextResult, convertToModelMessages, stepCountIs, streamText } from 'ai';

import { AuthContext } from '../../common/models/auth-context.model';
import { getAppLogger } from '../../common/utils/logger.util';
import { IContextService } from '../interfaces/context-service.interface';
import { ChatMessage } from '../models/chat-stream.model';

const logger = getAppLogger('chat-service');

const DEFAULT_MODEL = 'anthropic.claude-sonnet-4-20250514-v1:0';

interface ChatServiceConfig {
  // Optional MCP integration
  mcpUrl?: string;
  mcpApiKey?: string;
}

export class ChatService {
  private constructor(
    private readonly mcpTools: ToolSet,
    private readonly contextService?: IContextService,
  ) {}

  /**
   * Factory method to create ChatService with optional MCP integration
   * MCP is only initialized when configuration (URL + API key) is provided
   * This allows the starter to work out-of-box without external dependencies
   */
  static async create(config: ChatServiceConfig, contextService?: IContextService): Promise<ChatService> {
    logger.info('Initializing ChatService', { hasMCP: !!config.mcpUrl, hasContext: !!contextService });

    let mcpTools: ToolSet = {};

    // Initialize MCP only if config provided
    if (config.mcpUrl && config.mcpApiKey) {
      try {
        logger.info('Initializing MCP client', { url: config.mcpUrl });
        const mcpClient = await createMCPClient({
          transport: {
            type: 'http',
            url: config.mcpUrl,
            headers: { 'X-Api-Key': config.mcpApiKey },
          },
        });
        mcpTools = (await mcpClient.tools()) as ToolSet;
        logger.info('MCP client initialized successfully', {
          toolCount: Object.keys(mcpTools as Record<string, unknown>).length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Failed to initialize MCP client, continuing without MCP', {
          error: errorMessage,
          ...(errorStack && { stack: errorStack }),
        });
        // Continue without MCP - graceful degradation
      }
    } else {
      logger.info('MCP configuration not provided, continuing without MCP tools');
    }

    return new ChatService(mcpTools, contextService);
  }

  /**
   * Generic chat without session context
   * Uses default system prompt
   */
  streamChat(authContext: AuthContext, messages: ChatMessage[]): StreamTextResult<ToolSet, undefined> {
    logger.info('Starting generic chat stream', { userId: authContext.userId, messageCount: messages.length });

    const systemPrompt = this.getDefaultPrompt();
    const modelMessages: ModelMessage[] = convertToModelMessages(messages);

    return streamText({
      model: bedrock(DEFAULT_MODEL),
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
    });

    const systemPrompt = this.contextService
      ? await this.buildContextualPrompt(sessionId, authContext)
      : this.getDefaultPrompt();

    const modelMessages: ModelMessage[] = convertToModelMessages(messages);

    return streamText({
      model: bedrock(DEFAULT_MODEL),
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
