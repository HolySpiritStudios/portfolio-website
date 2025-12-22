import { AuthContext } from '../../common/models/auth-context.model';

/**
 * Optional interface for injecting domain-specific context into chat prompts
 * Teams can implement this to provide session-specific, user-specific, or other contextual data
 *
 * Example implementation:
 * - Fetch session metadata
 * - Load user preferences
 * - Retrieve relevant documents
 * - Build domain-specific system prompts
 */
export interface IContextService {
  /**
   * Get contextual information for a session
   * @param sessionId - Unique identifier for the session
   * @param authContext - Authentication context with user info
   * @returns Formatted context string to inject into system prompt
   */
  getContext(sessionId: string, authContext: AuthContext): Promise<string>;
}
