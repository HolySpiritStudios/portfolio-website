import react from '@vitejs/plugin-react';

import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..');

  // Load env file from parent directory
  const env = loadEnv(mode, envDir, '');

  return {
    envDir,
    server: {
      port: 3000,
      host: true,
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    // Map non-VITE_ prefixed env vars to VITE_ prefixed ones for frontend access
    define: {
      'import.meta.env.VITE_AWS_REGION': JSON.stringify(env.AWS_REGION || env.VITE_AWS_REGION),
      'import.meta.env.VITE_USER_POOL_ID': JSON.stringify(env.USER_POOL_ID || env.VITE_USER_POOL_ID),
      'import.meta.env.VITE_USER_POOL_CLIENT_ID': JSON.stringify(
        env.USER_POOL_CLIENT_ID || env.VITE_USER_POOL_CLIENT_ID,
      ),
      'import.meta.env.VITE_USER_POOL_DOMAIN': JSON.stringify(env.USER_POOL_DOMAIN || env.VITE_USER_POOL_DOMAIN),
      'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(env.ENVIRONMENT || env.VITE_ENVIRONMENT || 'localhost'),
      'import.meta.env.VITE_MIXPANEL_TOKEN': JSON.stringify(env.MIXPANEL_TOKEN || env.VITE_MIXPANEL_TOKEN),
      'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(env.SENTRY_DSN || env.VITE_SENTRY_DSN),
    },
  };
});
