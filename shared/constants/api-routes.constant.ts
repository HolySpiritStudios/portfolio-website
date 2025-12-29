/**
 * Centralized API route definitions shared between frontend and backend
 */
export const API_ROUTES = {
  AUTH: {
    SIGN_UP: '/authentication/v1/sign-up',
    LTI_LAUNCH: '/authentication/v1/lti/1.3/launch',
  },
  CHAT: {
    STREAM: `/chat/v1/stream`,
    SESSION_STREAM: `/chat/v1/sessions/:sessionId/stream`,
  },
  HELLO_WORLD: {
    HELLO: '/hello-world/v1/hello',
  },
} as const;

/**
 * Standard headers for Server-Sent Events (SSE) streaming
 */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
} as const;
