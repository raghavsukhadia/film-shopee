/**
 * Centralized logging utility
 * Replaces console.log/error/warn with proper logging levels
 * Environment-aware: verbose in dev, minimal in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  location?: string
}

class Logger {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  private formatMessage(level: LogLevel, message: string, data?: any, location?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      location
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error'
  }

  private log(level: LogLevel, message: string, data?: any, location?: string): void {
    if (!this.shouldLog(level)) return

    const entry = this.formatMessage(level, message, data, location)
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`
    const locationStr = location ? ` [${location}]` : ''

    switch (level) {
      case 'debug':
        console.debug(`${prefix}${locationStr}`, message, data || '')
        break
      case 'info':
        console.info(`${prefix}${locationStr}`, message, data || '')
        break
      case 'warn':
        console.warn(`${prefix}${locationStr}`, message, data || '')
        break
      case 'error':
        console.error(`${prefix}${locationStr}`, message, data || '')
        // In production, could send to error tracking service
        if (!this.isDevelopment && typeof window !== 'undefined') {
          // Could integrate with Sentry, LogRocket, etc.
        }
        break
    }
  }

  debug(message: string, data?: any, location?: string): void {
    this.log('debug', message, data, location)
  }

  info(message: string, data?: any, location?: string): void {
    this.log('info', message, data, location)
  }

  warn(message: string, data?: any, location?: string): void {
    this.log('warn', message, data, location)
  }

  error(message: string, error?: any, location?: string): void {
    // Handle Error objects properly
    if (error instanceof Error) {
      this.log('error', message, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(error as any).code && { code: (error as any).code }
      }, location)
    } else {
      this.log('error', message, error, location)
    }
  }

  // Convenience method for API routes
  api(route: string, method: string, message: string, data?: any): void {
    this.info(`[API ${method} ${route}] ${message}`, data, `api/${route}`)
  }

  // Convenience method for component logs
  component(componentName: string, message: string, data?: any): void {
    this.debug(`[${componentName}] ${message}`, data, componentName)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export class for testing
export { Logger }

// Export types
export type { LogLevel, LogEntry }

