import { z } from 'zod';

/**
 * Authentication configuration for MCP server
 */
export const mcpServerAuthSchema = z.object({
  /** HTTP header name for authentication (e.g., "Authorization", "x-api-key") */
  headerName: z.string().describe('HTTP header name for authentication'),
  /** API key or authentication token value */
  value: z.string().describe('API key or authentication token value'),
});
export type MCPServerAuth = z.infer<typeof mcpServerAuthSchema>;

/**
 * Model for MCP (Model Context Protocol) Server configuration
 * Used across chat service and DI container
 */
export const mcpServerSchema = z.object({
  /** Optional name for tool namespacing (defaults to server1, server2, etc.) */
  name: z.string().optional().describe('Optional name for tool namespacing'),
  /** MCP server URL endpoint */
  url: z.string().url().describe('MCP server URL endpoint'),
  /** Authentication configuration */
  auth: mcpServerAuthSchema,
});
export type MCPServer = z.infer<typeof mcpServerSchema>;

/**
 * Configuration for ChatService initialization
 * Supports multiple MCP servers for extensible tool integration
 */
export const chatServiceConfigSchema = z.object({
  /** Optional array of MCP servers to integrate */
  mcpServers: z.array(mcpServerSchema).optional(),
  /** Optional Bedrock model ID (defaults to Claude Opus 4.5) */
  model: z.string().optional().describe('Optional Bedrock model ID'),
  /** Whether the service is running in production mode */
  isProduction: z.boolean().default(false).describe('Whether the service is running in production mode'),
});
export type ChatServiceConfig = z.infer<typeof chatServiceConfigSchema>;

/**
 * Status of an MCP server connection
 */
export const mcpStatusSchema = z.object({
  status: z.enum(['connected', 'failed']).describe('Connection status'),
  url: z.string().url().describe('Server URL'),
  error: z.string().optional().describe('Error message if connection failed'),
  toolCount: z.number().optional().describe('Number of tools registered from this server'),
});
export type MCPStatus = z.infer<typeof mcpStatusSchema>;

/**
 * Result of the check_mcps tool
 */
export const checkMCPsResultSchema = z.object({
  message: z.string().describe('Summary message'),
  servers: z.record(mcpStatusSchema).describe('Status map of all configured servers'),
  totalTools: z.number().describe('Total number of tools successfully registered'),
});
export type CheckMCPsResult = z.infer<typeof checkMCPsResultSchema>;
