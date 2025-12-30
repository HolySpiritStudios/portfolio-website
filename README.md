# WS.Eng Monorepo Starter

## Setup

### Replacing Placeholders

1. Clone the repository
2. Find and replace the following strings:
   - `ws-mono-st` with a short, unique name for your project (all lowercase, dash-separated, max 12 characters)
   - `wseng-monorepo-starter` with a longer, unique name for your project (all lowercase, dash-separated)
   - `WS.Eng Monorepo Starter` with the name of your project
3. Run `pnpm i` in the root directory
4. Adjust the AWS account IDs in the README.md file to your own AWS account IDs
5. Adjust the infra/app.ts file with:
   - The AWS accounts for production and development.
   - Domain name and subdomain name for the project. You can use '' as the subdomain name if you want the app to be accessible at the root domain.
   - Certificate ARNs for the project. These certificates must have a wildcard that spans the entire domain name plus the root domain (if you use '' as the subdomain name).
6. Create secrets in Secrets Manager, with the names from the infra/app.ts file (see Secret Structure section below).
7. Create new Sentry and Mixpanel projects. Plug in the DSN and tokens into the secrets.
8. Create a new Postman workspace, update the link at the bottom of the README.md file and plug the workspace ID in the secrets.
9. Customize the visual identity (see Customizing Visual Identity section below).

### Customizing Visual Identity

The starter template includes a default design system that should be customized to match your project's brand identity.

#### 1. Logo

Replace the default logo with your own:

- **Create your logo**: Design a new SVG logo at `frontend/public/images/logo.svg`
  - Recommended size: 200x200 viewBox
  - The default logo uses a geometric hexagon design - replace with your brand's logo
  - Ensure the logo works well at small sizes (it's used at 48-64px in the UI)

#### 2. Brand Colors

Update the color palette in `frontend/tailwind.config.ts`:

```typescript
colors: {
  brand: {
    50: '#f0f9ff',   // Lightest shade
    100: '#e0f2fe',
    // ... update all shades 50-900
    500: '#0ea5e9',  // Main brand color
    DEFAULT: '#0ea5e9',
  },
  primary: { /* ... */ },
  secondary: { /* ... */ },
}
```

**Tips:**

- Use a color palette generator (like [Tailwind Color Generator](https://uicolors.app/create)) to create consistent shades from your main brand color
- The `brand` color is used for primary buttons, links, and accents
- The `primary` color is used for secondary UI elements
- The `secondary` color is used for neutral/muted elements
- Update or remove the legacy colors (`blue`, `cyan`, `lime`, `cream`) as they're deprecated

#### 3. Background Elements

Customize the decorative background elements in `frontend/src/common/components/background-elements.tsx`:

- **Gradient orbs**: Adjust the colors, sizes, and positions of the animated blob elements
- **Grid pattern**: Modify or remove the grid overlay
- **Animations**: The blob animation can be customized in `frontend/src/index.css`

To match your brand:

- Replace color classes like `bg-brand-400/20` with your preferred brand color shades
- Adjust opacity values to make elements more or less prominent
- Modify animation timing in the `@keyframes blob` definition

#### 4. Typography (Optional)

The starter uses the Inter font family. To use a different font:

- Add your font files to `frontend/public/fonts/`
- Update the font face declarations in your CSS
- Modify the `fontFamily` configuration in `frontend/tailwind.config.ts`

#### 5. Theme System

The starter includes a robust theme management system with support for light mode, dark mode, and system preference detection.

**Key Features:**

- CSS Variables-based theming for runtime customization
- Redux-managed theme state with persistence
- Automatic system preference detection
- Type-safe theme switching
- Semantic color tokens

**Customizing Theme Colors:**

Edit the CSS variables in `frontend/src/index.css`:

```css
:root {
  --brand-500: 14 165 233; /* Your primary brand color */
  --background: 255 255 255; /* Light mode background */
  --foreground: 15 23 42; /* Light mode text */
}

.dark {
  --brand-500: 56 189 248; /* Dark mode brand color */
  --background: 15 23 42; /* Dark mode background */
  --foreground: 248 250 252; /* Dark mode text */
}
```

**Using the Theme System:**

```tsx
import { useTheme } from '@/common/hooks/use-theme.hook';

function MyComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return <button onClick={() => setTheme('dark')}>Current: {resolvedTheme}</button>;
}
```

**Pre-built Theme Switcher:**

Import the `ThemeSwitcher` component to add theme switching anywhere:

```tsx
import { ThemeSwitcher } from '@/common/components/theme-switcher.component';

function Header() {
  return <ThemeSwitcher variant="buttons" showLabels />;
}
```

#### 6. Test Your Changes

After customizing the visual identity:

```bash
cd frontend/
pnpm run dev
```

Visit the sign-in, sign-up, and home screens to verify your branding looks consistent across all pages. Toggle between light and dark modes to ensure both themes look good.

### Secret Structure

The secrets in AWS Secrets Manager should follow this structure:

```json
{
  "MIXPANEL_TOKEN": "your-mixpanel-project-token",
  "SENTRY_DSN": "https://your-sentry-dsn@sentry.io/project-id",
  "POSTMAN_API_KEY": "PMAK-your-postman-api-key",
  "POSTMAN_WORKSPACE_ID": "your-postman-workspace-id",
  "TIMEBACK_CLIENT_ID": "your-timeback-client-id",
  "TIMEBACK_CLIENT_SECRET": "your-timeback-client-secret",
  "GOOGLE_CLIENT_ID": "your-google-client-id",
  "GOOGLE_CLIENT_SECRET": "your-google-client-secret",
  "MCP_SERVERS": "[{\"name\":\"shortio\",\"url\":\"https://ai-assistant.short.io/mcp\",\"auth\":{\"headerName\":\"authorization\",\"value\":\"your-api-key\"}}]",
  "CHAT_MODEL": "global.anthropic.claude-opus-4-5-20251101-v1:0"
}
```

**Secret Fields:**

- **MIXPANEL_TOKEN**: Project token from your Mixpanel project settings (for analytics)
- **SENTRY_DSN**: Data Source Name from your Sentry project settings (for error tracking)
- **POSTMAN_API_KEY**: API key for Postman API access (used for automated API documentation)
- **POSTMAN_WORKSPACE_ID**: Workspace ID where the API collection should be synced
- **TIMEBACK_CLIENT_ID**: OAuth client ID for TimeBack API integration (remove if not using TimeBack)
- **TIMEBACK_CLIENT_SECRET**: OAuth client secret for TimeBack API integration (remove if not using TimeBack)
- **GOOGLE_CLIENT_ID**: Google SSO OpenID client ID (remove if not using Google Sign-In)
- **GOOGLE_CLIENT_SECRET**: Google SSO OpenID client ID (remove if not using Google Sign-In)
- **MCP_SERVERS**: JSON array of MCP server configurations (as a string)
- **CHAT_MODEL**: Bedrock model ID to use for chat

## Extra Features

### AI Chat (with MCP Tool Use)

This starter includes a production-ready AI chat feature powered by Amazon Bedrock and the AI SDK, with support for Model Context Protocol (MCP) tool integrations.

**API Endpoints:**

- `POST /chat/v1/stream` - Generic chat endpoint
- `POST /chat/v1/sessions/:sessionId/stream` - Session-specific chat with context

**Setup:**

1. **Add Configuration to Secrets** (Optional - chat works with defaults):

```json
{
  "MCP_SERVERS": "[{\"name\":\"shortio\",\"url\":\"https://ai-assistant.short.io/mcp\",\"auth\":{\"headerName\":\"authorization\",\"value\":\"your-api-key\"}}]",
  "CHAT_MODEL": "global.anthropic.claude-opus-4-5-20251101-v1:0"
}
```

**Configuration Options:**

- `MCP_SERVERS` (optional): JSON array of MCP server configurations (as a string)
  - Format: `[{"name":"shortio","url":"https://api1.com/mcp","auth":{"headerName":"authorization","value":"key1"}}]`
  - `name` is optional (defaults to server1, server2, etc.)
  - Each server requires: `url`, `auth.headerName`, and `auth.value`
- `CHAT_MODEL` (optional): Bedrock model ID to use for chat
  - Defaults to `global.anthropic.claude-opus-4-5-20251101-v1:0` (best for complex reasoning)
  - Use `global.anthropic.claude-sonnet-4-20250514-v1:0` for faster, more cost-effective responses

2. **Frontend Integration**:

```tsx
import { ChatSidepanel } from '@/chat/components/chat-sidepanel.component';

function MyScreen() {
  const sessionId = 'session-123'; // Optional, for context-aware chat

  return <ChatSidepanel sessionId={sessionId} />;
}
```

3. **Backend Customization**:

To add session-specific context (e.g., user data, documents, etc.):

- Implement `IContextService` interface in `backend/app/chat/interfaces/context-service.interface.ts`
- Inject your context service in `backend/entrypoints/containers/chat-service.container.ts`
- Example: See PR#21 for `SessionContextService` implementation with TimeBack integration

**Adding Custom MCP Tools:**

1. Update secrets with your MCP server URL and credentials

**Configuring the AI Model:**

The AI model is configurable via the `CHAT_MODEL` secret in AWS Secrets Manager (see Setup section above). If not specified, it defaults to Claude Opus 4.5 for optimal performance.

Available models:

- `global.anthropic.claude-opus-4-5-20251101-v1:0` (default) - Best for complex reasoning and coding
- `global.anthropic.claude-sonnet-4-20250514-v1:0` - Balanced performance and cost
- Any other Bedrock-supported model ID

**Removing the Chat Feature:**

If you don't need AI chat:

1. Delete the following directories:
   - `backend/app/chat/`
   - `frontend/src/chat/`
2. Remove chat routes from `infra/constructs/backend.construct.ts` (lines ~412-426)
3. Remove chat Lambda handler: `backend/entrypoints/chat-api-handler.lambda.ts`
4. Remove chat container: `backend/entrypoints/containers/chat-service.container.ts`
5. Remove chat imports from `backend/debug/dev.ts`
6. Remove dependencies:
   - Backend: `@ai-sdk/amazon-bedrock`, `@ai-sdk/mcp`, `ai`
   - Frontend: `@ai-sdk/react`, `ai`
7. Remove MCP-related secrets from AWS Secrets Manager

If you do not need Google login:

- Remove the `signInWithGoogle` method from the aws-auth.util.ts file.
- Remove the `handleGoogleSignIn` method from the sign-in.hook.ts file.
- Remove the `googleProvider` from the backend.construct.ts file.

If you do not need to call the TimeBack API:

- Remove the `backend/app/common/integrations/timeback/` directory.
- Remove the `timeBackBaseUrl` property from the `infra/app.ts` file (all 3 environment configurations).
- Remove the `timeBackBaseUrl` property from the `BackendConstructProps` interface in the `backend.construct.ts` file.
- Remove the `TIMEBACK_BASE_URL` environment variable assignment in the `backend.construct.ts` file.
- Remove the `TIMEBACK_BASE_URL` entry from the `EnvironmentVariable` enum in the `environment.util.ts` file.
- Remove the `TimeBackEnvironmentSchema` from the `environment.util.ts` file and remove it from the merged `EnvironmentSchema`.

If you do not need LTI login (Magic Links):

- Remove the following files:
  - `backend/app/authentication/models/lti-launch.model.ts`
  - `backend/app/authentication/models/lti-launch.schema.ts`
  - `backend/app/authentication/models/magic-token.entity.ts`
  - `backend/app/authentication/repositories/magic-token.repository.ts`
- Remove the `ltiLaunch` method from `backend/app/authentication/controllers/authentication.controller.ts`.
- Remove the `ltiLaunch` method from `backend/app/authentication/interfaces/authentication-controller.interface.ts`.
- Remove the `setupLtiLaunch` method from `backend/app/authentication/routers/authentication.router.ts`.
- Remove the following methods from `backend/app/authentication/services/authentication.service.ts`: `handleLtiLaunch`, `verifyLtiIdToken`, `generateMagicToken`, `buildFrontendRedirectUrl`, `verifyMagicLinkChallenge`, `extractUserIdentity`, `ensureUserInDatabase`, `resolveFinalUser`.
- Remove the `signInWithMagicToken` method from `frontend/src/main/utils/aws/aws-auth.util.ts`.
- Remove the magic token handling block from `frontend/src/config/slices/environment-slice/thunks/rehydrate-config.thunk.ts`.
- Remove the Cognito custom auth challenge handlers from `backend/entrypoints/cognito-trigger.lambda.ts`: `handleDefineAuthChallenge`, `handleCreateAuthChallenge`, `handleVerifyAuthChallengeResponse`.
- Remove the following entries from the `EnvironmentVariable` enum in `backend/app/common/utils/environment.util.ts`: `LTI_ISSUER`, `LTI_JWKS_URL`, `LTI_AUDIENCE`, `FRONTEND_BASE_URL`.
- Remove the `ltiIssuer`, `ltiAudience`, and `timeBackBaseUrl` properties from the `BackendConstructProps` interface in `infra/constructs/backend.construct.ts`.
- Remove the LTI-related environment variable assignments (`LTI_ISSUER`, `LTI_JWKS_URL`, `LTI_AUDIENCE`, `FRONTEND_BASE_URL`) from the `getEnvironmentVariables()` method in `infra/constructs/backend.construct.ts`.
- Remove the `ltiIssuer`, `ltiAudience`, and `timeBackBaseUrl` properties from all stack configurations in `infra/app.ts`.

Note that by default, Google login is disabled on ephemeral environments (because you would need to add the redirect URIs to the Google Cloud Console for each environment), while self sign up is enabled only on ephemeral environments (such that you can login/sign up on ephemeral environments to test the app).

### Cleanup

Once you're done with all the setup steps above (placeholders, secrets, visual identity, etc.), remove the entire "Setup" section (including "Replacing Placeholders", "Customizing Visual Identity", "Secret Structure", "Extra Features", and "Cleanup") from the README. Commit and push to your new repository. This should automatically create your integration environment.

## Project Structure

```
wseng-monorepo-starter/
├── backend/          # TypeScript/Node.js API server
│   ├── app/          # Core application modules (auth, chat, hello-world)
│   ├── entrypoints/  # AWS Lambda handlers & DI containers
│   └── debug/        # Local development & debugging server
├── frontend/         # React/TypeScript web application
│   ├── src/          # Application source code
│   │   ├── chat/             # AI Chat feature & screens
│   │   ├── user-management/  # User account & profile management
│   │   ├── main/             # Core layout, routers & app-wide utils
│   │   └── common/           # Reusable UI components & hooks
│   └── public/       # Static assets & resources
├── shared/           # Shared constants & types (Single Source of Truth)
├── infra/           # AWS CDK infrastructure as code
│   ├── constructs/  # Reusable infrastructure components
│   └── stacks/      # CloudFormation stack definitions
├── scripts/          # Workspace maintenance & sync scripts
└── docs/            # Documentation & development guides
```

## Prerequisites

### Development Environment

- **Node.js**: Version 22+ (as specified in GitHub Actions)
- **pnpm**: Package manager for Node.js dependencies

### AWS Access

The platform requires access to one of two AWS accounts:

| Environment | Account ID   | Account Name                          |
| ----------- | ------------ | ------------------------------------- |
| Production  | 856284715153 | RAM-AWS-Dev-WSEngineering-WSEng-Admin |
| Development | 856284715153 | RAM-AWS-Dev-WSEngineering-WSEng-Admin |

During development, you should have the Development account selected in your AWS profile (you may configure it in the .env file with the `AWS_PROFILE` variable).

## Local Development

### Environment Setup

The project uses a single `.env` file in the root directory shared across all components. To set up your local environment:

1. **Sync from AWS**: Run the update script to populate your `.env` file with the correct resource IDs (Cognito, Secrets Manager, etc.) from a deployed environment:

   ```bash
   # For a shared environment (e.g., integration)
   pnpm script update-env --env integration

   # For a pull request environment
   pnpm script update-env --pr <pr-number>
   ```

2. **Configure for Local Development**: To use the local backend server instead of the deployed one, update the following variables in your `.env`:

   ```bash
   ENVIRONMENT=localhost
   API_BASE_URL=http://localhost:3001
   ```

   **Note**: The Vite config automatically maps `AWS_REGION`, `USER_POOL_ID`, etc., to their `VITE_` prefixed versions for the frontend. You do not need to duplicate them.

### Quality & Maintenance

Run these from the root directory to maintain code quality:

```bash
pnpm run check   # Runs linting, formatting, and type checking across the monorepo
pnpm run fix     # Automatically fixes linting and formatting issues
```

### Starting Development Servers

The chat interface and API can be developed completely locally. The backend dev server includes full support for streaming chat responses.

#### 1. Backend

```bash
cd backend/
pnpm run dev        # Start server on http://localhost:3001
pnpm run dev:watch  # Start server with auto-reload
```

#### 2. Frontend

```bash
cd frontend/
pnpm run dev        # Start server on http://localhost:3000
```

#### 3. Access the App

Open `http://localhost:3000?setEnv=localhost` in your browser. The `?setEnv=localhost` parameter tells the frontend to use the local backend. This setting is persisted in browser storage.

### Switching Between Environments

The frontend can switch between different environments using the `?setEnv` query parameter:

- **Localhost**: `http://localhost:3000?setEnv=localhost` - Uses local backend at port 3001
- **Integration**: `http://localhost:3000?setEnv=integration` - Uses deployed integration environment
- **Production**: `http://localhost:3000?setEnv=production` - Uses production environment

### Troubleshooting Login Issues

If the login button doesn't work:

1. **Check the browser console**: Look for a log message like `🔧 Localhost configuration:` that shows your Cognito settings.
2. **Verify environment variables**: Ensure `USER_POOL_ID`, `USER_POOL_CLIENT_ID`, and `USER_POOL_DOMAIN` are set in your `.env` file.
3. **Restart the frontend**: After changing `.env`, restart the Vite dev server to pick up new values.
4. **Clear browser storage**: Go to `http://localhost:3000?setEnv=localhost` to force the environment to localhost mode.

### API Documentation & Testing

- **Backend API**: `http://localhost:3001`
- **API Documentation**: Available at `/docs/viewer` on the backend, or check `/docs/llms.txt` and `/docs/openapi.json`.
- **Chat Streaming**: Handled directly via SSE at `/chat/v1/stream`.
