import { AuthContext } from '../../common/models/auth-context.model';
import { NotFoundError } from '../../common/utils/errors';
import { ChatStreamResult, IChatController } from '../interfaces/chat-controller.interface';
import { ChatMessage } from '../models/chat-stream.model';

/**
 * Mock implementation for testing
 */
export class MockChatController implements IChatController {
  streamChat(_messages: ChatMessage[], _authContext: AuthContext): Promise<ChatStreamResult> {
    throw new NotFoundError('Mock implementation - chat not available');
  }

  streamSessionChat(
    _sessionId: string,
    _messages: ChatMessage[],
    _authContext: AuthContext,
  ): Promise<ChatStreamResult> {
    throw new NotFoundError('Mock implementation - session chat not available');
  }
}
