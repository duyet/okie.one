/**
 * Structured Logging System for Okie
 *
 * Provides consistent, structured logging with context and levels
 * Optimized for development debugging and production monitoring
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  [key: string]: unknown
}

export interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  service: string
}

class Logger {
  private service: string
  private isDevelopment: boolean

  constructor(service: string) {
    this.service = service
    this.isDevelopment = process.env.NODE_ENV === "development"
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      service: this.service,
    }
  }

  private output(entry: LogEntry): void {
    if (this.isDevelopment) {
      // Development: Pretty console output
      const contextStr = entry.context
        ? `\n${JSON.stringify(entry.context, null, 2)}`
        : ""

      switch (entry.level) {
        case "debug":
          console.debug(`🔍 [${entry.service}] ${entry.message}${contextStr}`)
          break
        case "info":
          console.info(`ℹ️ [${entry.service}] ${entry.message}${contextStr}`)
          break
        case "warn":
          console.warn(`⚠️ [${entry.service}] ${entry.message}${contextStr}`)
          break
        case "error":
          console.error(`❌ [${entry.service}] ${entry.message}${contextStr}`)
          break
      }
    } else {
      // Production: Structured JSON for monitoring
      console.log(JSON.stringify(entry))
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.output(this.formatLog("debug", message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    this.output(this.formatLog("info", message, context))
  }

  warn(message: string, context?: LogContext): void {
    this.output(this.formatLog("warn", message, context))
  }

  error(message: string, context?: LogContext): void {
    this.output(this.formatLog("error", message, context))
  }

  // Chat-specific logging methods
  chatRequest(model: string, messageCount: number, context?: LogContext): void {
    this.info("Chat API request", {
      model,
      messageCount,
      ...context,
    })
  }

  chatResponse(
    model: string,
    inputTokens: number,
    outputTokens: number,
    duration: number,
    context?: LogContext
  ): void {
    this.info("Chat API response", {
      model,
      inputTokens,
      outputTokens,
      duration,
      ...context,
    })
  }

  tokenUsage(
    model: string,
    provider: string,
    inputTokens: number,
    outputTokens: number,
    context?: LogContext
  ): void {
    this.info("Token usage recorded", {
      model,
      provider,
      inputTokens,
      outputTokens,
      ...context,
    })
  }

  fileOperation(
    operation: string,
    fileName: string,
    fileSize?: number,
    context?: LogContext
  ): void {
    this.info(`File ${operation}`, {
      fileName,
      fileSize,
      ...context,
    })
  }

  authEvent(event: string, userId?: string, context?: LogContext): void {
    this.info(`Auth: ${event}`, {
      userId,
      ...context,
    })
  }

  mcpTool(toolName: string, operation: string, context?: LogContext): void {
    this.info(`MCP tool: ${toolName}`, {
      operation,
      ...context,
    })
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.debug(`Performance: ${operation}`, {
      duration,
      ...context,
    })
  }
}

// Service-specific loggers
export const chatLogger = new Logger("chat")
export const apiLogger = new Logger("api")
export const fileLogger = new Logger("file-handling")
export const authLogger = new Logger("auth")
export const mcpLogger = new Logger("mcp")
export const dbLogger = new Logger("database")
export const uiLogger = new Logger("ui")
export const analyticsLogger = new Logger("analytics")

// Default logger
export const logger = new Logger("app")

// Utility function to create service-specific loggers
export function createLogger(service: string): Logger {
  return new Logger(service)
}
