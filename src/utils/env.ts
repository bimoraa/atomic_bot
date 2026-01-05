// - Environment Variable Utilities - \\
// - Type-safe environment variable access and parsing - \\

/**
 * Gets an environment variable with optional fallback
 * @param {string} key - Environment variable name
 * @param {string} fallback - Default value if not found
 * @returns {string} Environment variable value or fallback
 */
export function get(key: string, fallback?: string): string {
  return process.env[key] ?? fallback ?? ""
}

/**
 * Gets a required environment variable or throws error
 * @param {string} key - Environment variable name
 * @returns {string} Environment variable value
 * @throws {Error} If environment variable is not set
 */
export function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env: ${key}`)
  return value
}

/**
 * Parses an environment variable as integer
 * @param {string} key - Environment variable name
 * @param {number} fallback - Default value if not found or invalid
 * @returns {number} Parsed integer value
 */
export function int(key: string, fallback: number = 0): number {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Parses an environment variable as float
 * @param {string} key - Environment variable name
 * @param {number} fallback - Default value if not found or invalid
 * @returns {number} Parsed float value
 */
export function float(key: string, fallback: number = 0): number {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = parseFloat(value)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Parses an environment variable as boolean
 * @param {string} key - Environment variable name
 * @param {boolean} fallback - Default value if not found
 * @returns {boolean} Parsed boolean value
 */
export function bool(key: string, fallback: boolean = false): boolean {
  const value = process.env[key]?.toLowerCase()
  if (!value) return fallback
  return ["true", "1", "yes", "on"].includes(value)
}

/**
 * Parses an environment variable as array
 * @param {string} key - Environment variable name
 * @param {string} separator - Separator character for splitting
 * @returns {string[]} Array of trimmed values
 */
export function array(key: string, separator: string = ","): string[] {
  const value = process.env[key]
  if (!value) return []
  return value.split(separator).map((s) => s.trim()).filter(Boolean)
}

/**
 * Parses an environment variable as JSON
 * @param {string} key - Environment variable name
 * @param {T} fallback - Default value if not found or invalid JSON
 * @returns {T | undefined} Parsed JSON value
 */
export function json<T>(key: string, fallback?: T): T | undefined {
  const value = process.env[key]
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

// - Environment Detection - \\
// - Functions for detecting the current environment - \\

/**
 * Checks if running in production environment
 * @returns {boolean} True if NODE_ENV is production
 */
export function is_production(): boolean {
  return process.env.NODE_ENV === "production"
}

/**
 * Checks if running in development environment
 * @returns {boolean} True if NODE_ENV is development or not set
 */
export function is_development(): boolean {
  return process.env.NODE_ENV === "development" || !process.env.NODE_ENV
}

/**
 * Checks if running in test environment
 * @returns {boolean} True if NODE_ENV is test
 */
export function is_test(): boolean {
  return process.env.NODE_ENV === "test"
}

/**
 * Gets the current NODE_ENV value
 * @returns {string} Current environment name
 */
export function node_env(): string {
  return process.env.NODE_ENV ?? "development"
}
