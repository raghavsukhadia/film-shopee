/**
 * Monitoring & Observability Setup
 * 
 * Provides error tracking and performance monitoring integration.
 * Supports Sentry integration.
 * 
 * To enable Sentry:
 * 1. npm install @sentry/nextjs
 * 2. npx @sentry/wizard@latest -i nextjs
 * 3. Set SENTRY_DSN in environment variables
 */

import { logger } from './logger'

/**
 * Initialize error tracking (Sentry)
 */
export function initErrorTracking(): void {
  if (typeof window === 'undefined') return

  try {
    // Check if Sentry is available
    if ((window as any).Sentry) {
      const Sentry = (window as any).Sentry
      
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event, hint) {
          // Filter out sensitive data
          if (event.request) {
            // Remove sensitive headers
            if (event.request.headers) {
              delete event.request.headers.authorization
              delete event.request.headers.cookie
            }
            
            // Remove sensitive query params
            if (event.request.query_string) {
              const params = new URLSearchParams(event.request.query_string)
              params.delete('token')
              params.delete('api_key')
              event.request.query_string = params.toString()
            }
          }
          
          return event
        },
      })
      
      logger.info('Error tracking initialized', { service: 'Sentry' })
    } else {
      logger.debug('Sentry not available - install @sentry/nextjs to enable error tracking')
    }
  } catch (error) {
    logger.error('Failed to initialize error tracking', error)
  }
}

/**
 * Track performance metrics
 */
export function trackPerformance(name: string, duration: number, metadata?: Record<string, any>): void {
  if (typeof window === 'undefined') return

  try {
    // Log performance metric
    logger.debug('Performance metric', {
      name,
      duration,
      ...metadata,
    })

    // Send to monitoring service if available
    if ((window as any).Sentry) {
      const Sentry = (window as any).Sentry
      Sentry.metrics.distribution(name, duration, {
        unit: 'millisecond',
        tags: metadata,
      })
    }

    // Send to analytics if available
    if ((window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        name,
        value: Math.round(duration),
        event_category: 'Performance',
      })
    }
  } catch (error) {
    logger.error('Failed to track performance', error)
  }
}

/**
 * Performance measurement wrapper
 */
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  
  return fn().finally(() => {
    const duration = performance.now() - start
    trackPerformance(name, duration)
  })
}

/**
 * Track custom events
 */
export function trackEvent(name: string, properties?: Record<string, any>): void {
  if (typeof window === 'undefined') return

  try {
    logger.debug('Event tracked', { name, ...properties })

    // Send to analytics if available
    if ((window as any).gtag) {
      (window as any).gtag('event', name, properties)
    }
  } catch (error) {
    logger.error('Failed to track event', error)
  }
}

