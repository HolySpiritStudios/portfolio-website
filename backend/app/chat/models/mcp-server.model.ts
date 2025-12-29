/**
 * Authentication configuration for MCP server
 */
export interface MCPServerAuth {
  /** HTTP header name for authentication (e.g., "Authorization", "x-api-key") */
  headerName: string;
  /** API key or authentication token value */
  value: string;
}

/**
 * Model for MCP (Model Context Protocol) Server configuration
 * Used across chat service and DI container
 */
export interface MCPServer {
  /** Optional name for tool namespacing (defaults to server1, server2, etc.) */
  name?: string;
  /** MCP server URL endpoint */
  url: string;
  /** Authentication configuration */
  auth: MCPServerAuth;
}

/**
 * Configuration for ChatService initialization
 * Supports multiple MCP servers for extensible tool integration
 */
export interface ChatServiceConfig {
  /** Optional array of MCP servers to integrate */
  mcpServers?: MCPServer[];
  /** Optional Bedrock model ID (defaults to Claude Opus 4.5) */
  model?: string;
}
