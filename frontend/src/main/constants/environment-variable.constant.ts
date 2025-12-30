export const EnvironmentVariable = {
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  MIXPANEL_TOKEN: import.meta.env.VITE_MIXPANEL_TOKEN,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
} as const;
