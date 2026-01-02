/**
 * Centralized Logging Utility
 * 
 * Provides structured logging that:
 * - Logs to console in development
 * - Sends to logging service (Sentry) in production
 * - Filters sensitive data (passwords, tokens, API keys)
 * - Supports log levels (debug, info, warn, error)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

// Sensitive data patterns to filter
const SENSITIVE_PATTERNS = [
  /password/gi,
  /token/gi,
  /secret/gi,
  /api[_-]?key/gi,
  /auth[_-]?token/gi,
  /access[_-]?token/gi,
  /refresh[_-]?token/gi,
  /authorization/gi,
  /bearer/gi,
  /credential/gi,
  /private[_-]?key/gi,
  /session[_-]?id/gi,
]

// Fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authToken',
  'auth_token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'bearer',
  'credential',
  'privateKey',
  'private_key',
  'sessionId',
  'session_id',
  'service_role_key',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
]

/**
 * Sanitize data to remove sensitive information
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item))
  }

  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    
    // Check if key contains sensitive patterns
    const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key)) ||
                          SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))
    
    if (isSensitiveKey) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value)
    } else if (typeof value === 'string') {
      // Check if value contains sensitive patterns
      const isSensitiveValue = SENSITIVE_PATTERNS.some(pattern => pattern.test(value))
      sanitized[key] = isSensitiveValue ? '[REDACTED]' : value
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Format log message with context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const sanitizedContext = context ? sanitizeData(context) : undefined
  
  if (sanitizedContext) {
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(sanitizedContext)}`
  }
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`
}

/**
 * Send log to external service (Sentry) in production
 */
async function sendToLoggingService(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  // Only send errors and warnings to logging service in production
  if (process.env.NODE_ENV !== 'production' || (level !== 'error' && level !== 'warn')) {
    return
  }

  try {
    // If Sentry is configured, use it
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry
      const sanitizedContext = context ? sanitizeData(context) : undefined
      
      if (level === 'error' && error) {
        Sentry.captureException(error, {
          level: 'error',
          tags: { source: 'logger' },
          extra: sanitizedContext,
        })
      } else {
        Sentry.captureMessage(message, {
          level: level === 'warn' ? 'warning' : 'error',
          tags: { source: 'logger' },
          extra: sanitizedContext,
        })
      }
    }
  } catch (err) {
    // Silently fail - don't break the app if logging fails
    console.error('Failed to send log to logging service:', err)
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(formatMessage('debug', message, context))
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(formatMessage('info', message, context))
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const formatted = formatMessage('warn', message, context)
    
    if (this.isDevelopment) {
      console.warn(formatted)
    }
    
    sendToLoggingService('warn', message, context)
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const formatted = formatMessage('error', message, context)
    
    if (this.isDevelopment) {
      console.error(formatted, error || '')
    }
    
    const errorObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined
    sendToLoggingService('error', message, context, errorObj)
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown): void {
    switch (level) {
      case 'debug':
        this.debug(message, context)
        break
      case 'info':
        this.info(message, context)
        break
      case 'warn':
        this.warn(message, context)
        break
      case 'error':
        this.error(message, error, context)
        break
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export types for use in other files
export type { LogLevel, LogContext }

