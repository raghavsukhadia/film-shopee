/**
 * Retry Logic Utility
 * 
 * Provides retry functionality with exponential backoff for API calls
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: (error: any) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: (error: any) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (!error) return false
    
    // Network errors
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return true
    }
    
    // Timeout errors
    if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
      return true
    }
    
    // HTTP 5xx errors
    if (error.status >= 500 && error.status < 600) {
      return true
    }
    
    // Rate limit errors (429) - retry after delay
    if (error.status === 429) {
      return true
    }
    
    return false
  },
}

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt)
  return Math.min(delay, options.maxDelay)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt >= opts.maxRetries) {
        break
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts)
      await sleep(delay)
    }
  }
  
  throw lastError
}

/**
 * Retry with custom error handling
 */
export async function retryWithHandler<T>(
  fn: () => Promise<T>,
  onRetry: (error: any, attempt: number) => void,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt >= opts.maxRetries) {
        break
      }
      
      // Call retry handler
      onRetry(error, attempt + 1)
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts)
      await sleep(delay)
    }
  }
  
  throw lastError
}

/**
 * Create a retryable Supabase query wrapper
 */
export function createRetryableQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  return retry(async () => {
    const result = await queryFn()
    
    // If there's an error, throw it so retry can handle it
    if (result.error) {
      throw result.error
    }
    
    return result
  }, {
    ...options,
    retryableErrors: (error: any) => {
      // Retry on network errors and 5xx errors
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        return true
      }
      
      // Retry on specific Supabase errors
      if (error?.code === 'PGRST116' || error?.code === 'PGRST301') {
        return true
      }
      
      return options.retryableErrors ? options.retryableErrors(error) : false
    },
  }).catch((error) => {
    return { data: null, error }
  })
}

