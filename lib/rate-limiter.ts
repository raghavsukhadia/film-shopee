/**
 * Rate Limiting Utility for API Routes
 * 
 * Provides rate limiting to prevent abuse and DDoS attacks.
 * Uses token bucket algorithm for efficient rate limiting.
 */

interface TokenBucket {
  tokens: number
  lastRefill: number
}

interface RateLimitConfig {
  capacity: number // Maximum tokens
  refillRate: number // Tokens per interval
  refillIntervalMs: number // Refill interval in milliseconds
}

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map()
  private readonly config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now()
    const timePassed = now - bucket.lastRefill
    const tokensToAdd = Math.floor(timePassed / this.config.refillIntervalMs) * this.config.refillRate
    
    bucket.tokens = Math.min(this.config.capacity, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }

  private getBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key)
    
    if (!bucket) {
      bucket = {
        tokens: this.config.capacity,
        lastRefill: Date.now()
      }
      this.buckets.set(key, bucket)
    }
    
    this.refillBucket(bucket)
    return bucket
  }

  /**
   * Check if request is allowed
   */
  public isAllowed(key: string): boolean {
    const bucket = this.getBucket(key)
    
    if (bucket.tokens > 0) {
      bucket.tokens--
      return true
    }
    
    return false
  }

  /**
   * Get remaining tokens for a key
   */
  public getRemainingTokens(key: string): number {
    const bucket = this.getBucket(key)
    return bucket.tokens
  }

  /**
   * Get reset time (when tokens will be refilled)
   */
  public getResetTime(key: string): number {
    const bucket = this.getBucket(key)
    return bucket.lastRefill + this.config.refillIntervalMs
  }

  /**
   * Clean up old buckets to prevent memory leaks
   */
  public cleanup(): void {
    const now = Date.now()
    const maxAge = 60 * 60 * 1000 // 1 hour
    
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key)
      }
    }
  }
}

// Rate limit configurations for different endpoint types
export const rateLimitConfigs = {
  // Strict limits for authentication endpoints
  auth: {
    capacity: 5,
    refillRate: 1,
    refillIntervalMs: 60000, // 1 request per minute
  },
  // Moderate limits for general API endpoints
  api: {
    capacity: 100,
    refillRate: 10,
    refillIntervalMs: 60000, // 10 requests per minute
  },
  // Lenient limits for read-only endpoints
  read: {
    capacity: 200,
    refillRate: 20,
    refillIntervalMs: 60000, // 20 requests per minute
  },
  // Very strict limits for sensitive operations
  sensitive: {
    capacity: 3,
    refillRate: 1,
    refillIntervalMs: 300000, // 1 request per 5 minutes
  },
}

// Create rate limiter instances
export const authRateLimiter = new RateLimiter(rateLimitConfigs.auth)
export const apiRateLimiter = new RateLimiter(rateLimitConfigs.api)
export const readRateLimiter = new RateLimiter(rateLimitConfigs.read)
export const sensitiveRateLimiter = new RateLimiter(rateLimitConfigs.sensitive)

// Clean up old buckets every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    authRateLimiter.cleanup()
    apiRateLimiter.cleanup()
    readRateLimiter.cleanup()
    sensitiveRateLimiter.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Get client identifier for rate limiting
 */
export function getClientId(request: Request): string {
  // Try to get IP from various headers (for proxy/load balancer scenarios)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  
  // Also use user agent for additional identification
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return `${ip}:${userAgent.slice(0, 50)}`
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: Request,
  type: 'auth' | 'api' | 'read' | 'sensitive' = 'api'
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const clientId = getClientId(request)
  
  let limiter: RateLimiter
  switch (type) {
    case 'auth':
      limiter = authRateLimiter
      break
    case 'read':
      limiter = readRateLimiter
      break
    case 'sensitive':
      limiter = sensitiveRateLimiter
      break
    default:
      limiter = apiRateLimiter
  }
  
  const allowed = limiter.isAllowed(clientId)
  const remaining = limiter.getRemainingTokens(clientId)
  const resetTime = limiter.getResetTime(clientId)
  
  return {
    allowed,
    remaining,
    resetTime,
  }
}

export { RateLimiter }
export type { RateLimitConfig }

