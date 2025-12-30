import { AuthContext } from '../../common/models/auth-context.model';
import { ChatMessage } from '../models/chat-stream.model';

export interface ChatStreamResult {
  toUIMessageStream(): AsyncIterable<unknown>;
}

export interface IChatController {
  streamChat(messages: ChatMessage[], authContext: AuthContext): Promise<ChatStreamResult>;
  streamSessionChat(sessionId: string, messages: ChatMessage[], authContext: AuthContext): Promise<ChatStreamResult>;
}
