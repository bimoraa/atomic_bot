const is_production = process.env.NODE_ENV === "production"

export class Logger {
  private prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  private format_message(level: string, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level}] [${this.prefix}] ${message}`
  }

  info(message: string, ...args: unknown[]): void {
    if (!is_production) {
      console.log(this.format_message("INFO", message), ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.format_message("WARN", message), ...args)
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.format_message("ERROR", message), ...args)
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG === "true" && !is_production) {
      console.debug(this.format_message("DEBUG", message), ...args)
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (!is_production) {
      console.log(this.format_message("SUCCESS", message), ...args)
    }
  }
}

export function create_logger(prefix: string): Logger {
  return new Logger(prefix)
}

export function log_info(prefix: string, message: string, ...args: unknown[]): void {
  const logger = create_logger(prefix)
  logger.info(message, ...args)
}

export function log_warn(prefix: string, message: string, ...args: unknown[]): void {
  const logger = create_logger(prefix)
  logger.warn(message, ...args)
}

export function log_error(prefix: string, message: string, ...args: unknown[]): void {
  const logger = create_logger(prefix)
  logger.error(message, ...args)
}

export function log_debug(prefix: string, message: string, ...args: unknown[]): void {
  const logger = create_logger(prefix)
  logger.debug(message, ...args)
}

export function measure_time<T>(fn: () => T, label?: string): T {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  const duration = (end - start).toFixed(2)
  if (!is_production) {
    console.log(`[PERF] ${label || "Execution"}: ${duration}ms`)
  }
  return result
}

export async function measure_time_async<T>(fn: () => Promise<T>, label?: string): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  const duration = (end - start).toFixed(2)
  if (!is_production) {
    console.log(`[PERF] ${label || "Execution"}: ${duration}ms`)
  }
  return result
}

export function inspect(obj: unknown, depth: number = 2): string {
  return JSON.stringify(obj, null, 2).split("\n").slice(0, depth * 10).join("\n")
}

// - SIMPLE LOG WRAPPER (PRODUCTION SAFE) - \\
export const log = {
  /**
   * @param {...any[]} args - Arguments to log
   * @returns {void}
   */
  log: (...args: any[]): void => {
    if (!is_production) {
      console.log(...args)
    }
  },

  /**
   * @param {...any[]} args - Arguments to warn
   * @returns {void}
   */
  warn: (...args: any[]): void => {
    console.warn(...args)
  },

  /**
   * @param {...any[]} args - Arguments to error
   * @returns {void}
   */
  error: (...args: any[]): void => {
    console.error(...args)
  },

  /**
   * @param {...any[]} args - Arguments to info
   * @returns {void}
   */
  info: (...args: any[]): void => {
    if (!is_production) {
      console.info(...args)
    }
  },

  /**
   * @param {...any[]} args - Arguments to debug
   * @returns {void}
   */
  debug: (...args: any[]): void => {
    if (!is_production) {
      console.debug(...args)
    }
  },
}
