import { AuthContext } from '../../common/models/auth-context.model';
import { getAppLogger } from '../../common/utils/logger.util';
import { ChatStreamResult, IChatController } from '../interfaces/chat-controller.interface';
import { ChatMessage } from '../models/chat-stream.model';
import { ChatService } from '../services/chat.service';

const logger = getAppLogger('chat-controller');

export class ChatController implements IChatController {
  constructor(private readonly chatService: ChatService) {}

  async streamChat(messages: ChatMessage[], authContext: AuthContext): Promise<ChatStreamResult> {
    logger.info('Generic chat request', { userId: authContext.userId, messageCount: messages.length });
    return Promise.resolve(this.chatService.streamChat(authContext, messages));
  }

  async streamSessionChat(
    sessionId: string,
    messages: ChatMessage[],
    authContext: AuthContext,
  ): Promise<ChatStreamResult> {
    logger.info('Session chat request', { sessionId, userId: authContext.userId, messageCount: messages.length });
    return this.chatService.streamSessionChat(sessionId, authContext, messages);
  }
}
