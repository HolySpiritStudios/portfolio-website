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
