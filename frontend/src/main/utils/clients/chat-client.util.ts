import { fetchAuthSession } from 'aws-amplify/auth';

export interface ChatTransportConfig {
  url: string;
  headers?: Record<string, string>;
}

/**
 * Utility for creating chat transports with authentication
 * Manages JWT token injection and URL construction for chat endpoints
 *
 * Usage:
 * - Initialize during app bootstrap: initializeChatClient(apiBaseUrl)
 * - Get transport in components: getChatClientUtil().getTransport(sessionId)
 */
export class ChatClientUtil {
  private static instance: ChatClientUtil;

  private constructor(private readonly baseUrl: string) {}

  static getInstance(baseUrl?: string): ChatClientUtil {
    if (!ChatClientUtil.instance) {
      if (!baseUrl) {
        throw new Error('ChatClientUtil must be initialized with baseUrl');
      }
      ChatClientUtil.instance = new ChatClientUtil(baseUrl);
    }
    return ChatClientUtil.instance;
  }

  /**
   * Get transport for session-specific chat
   * Provides context-aware chat enriched with session data
   *
   * @param sessionId - Unique identifier for the session
   * @returns Transport configuration for useChat hook
   */
  async getTransport(sessionId: string): Promise<ChatTransportConfig> {
    const idToken = await this.getIdToken();
    return {
      url: `${this.baseUrl}/chat/v1/sessions/${encodeURIComponent(sessionId)}/stream`,
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Get transport for generic chat (no session context)
   * Provides general-purpose chat without domain-specific context
   *
   * @returns Transport configuration for useChat hook
   */
  async getGenericTransport(): Promise<ChatTransportConfig> {
    const idToken = await this.getIdToken();
    return {
      url: `${this.baseUrl}/chat/v1/stream`,
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Get current user's JWT token from Amplify session
   * @throws Error if not authenticated
   */
  private async getIdToken(): Promise<string> {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
      throw new Error('Not authenticated - ID token not available');
    }
    return idToken;
  }
}

/**
 * Singleton accessor for ChatClientUtil
 * Must be initialized before use
 */
export function getChatClientUtil(): ChatClientUtil {
  return ChatClientUtil.getInstance();
}

/**
 * Initialize chat client during app bootstrap
 * Call this in your app initialization code
 *
 * @param apiBaseUrl - Base URL for the API (e.g., 'https://api.example.com')
 */
export function initializeChatClient(apiBaseUrl: string): void {
  ChatClientUtil.getInstance(apiBaseUrl);
}
