/**
 * Application name constants
 */

export const APP_NAME = 'portfolio';
export const OWNER_EMAIL = 'serban.petrescu@trilogy.com';

/**
 * Returns the full application name with environment suffix
 * @param env Environment name (e.g., 'pr1', 'staging', 'production')
 * @returns Formatted application name with environment suffix
 */
export const getAppNameWithEnv = (env: string): string => `${APP_NAME}-${env.toLowerCase()}`;

/**
 * Creates a resource name with the app name prefix and environment
 * @param env Environment name (e.g., 'pr1', 'staging', 'production')
 * @param resourceName The specific resource name suffix
 * @returns Formatted resource name with app name prefix and environment
 */
export const getResourceName = (env: string, resourceName: string): string =>
  `${APP_NAME}-${env.toLowerCase()}-${resourceName}`;

/**
 * Creates an SSM parameter name for app-specific parameters
 * @param env Environment name (e.g., 'pr1', 'staging', 'production')
 * @param parameterName The specific parameter name
 * @returns Formatted SSM parameter name
 */
export const getSSMParameterName = (env: string, parameterName: string): string =>
  `/${APP_NAME}/${env.toLowerCase()}/${parameterName}`;
