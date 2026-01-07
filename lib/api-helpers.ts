/**
 * API Route Helpers
 * 
 * Provides utilities for API routes including:
 * - Rate limiting
 * - Error handling
 * - Response formatting
 */

import { NextResponse } from 'next/server'
import { rateLimit, getClientId } from '@/lib/utils/rate-limiter'
import { logger } from '@/lib/utils/logger'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  })
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string | Error,
  status: number = 500,
  message?: string
): NextResponse<ApiResponse> {
  const errorMessage = error instanceof Error ? error.message : error
  
  logger.error('API Error', error instanceof Error ? error : undefined, {
    error: errorMessage,
    status,
    message,
  })
  
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      message,
    },
    { status }
  )
}

/**
 * Rate limit wrapper for API routes
 */
export async function withRateLimit(
  request: Request,
  type: 'auth' | 'api' | 'read' | 'sensitive' = 'api'
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const limit = await rateLimit(request, type)
  
  if (!limit.allowed) {
    const clientId = getClientId(request)
    logger.warn('Rate limit exceeded', {
      clientId,
      type,
      path: new URL(request.url).pathname,
    })
    
    return {
      allowed: false,
      response: errorResponse(
        'Rate limit exceeded. Please try again later.',
        429,
        `Rate limit exceeded. Reset in ${Math.ceil((limit.resetTime - Date.now()) / 1000)} seconds.`
      ),
    }
  }
  
  return { allowed: true }
}

/**
 * Wrapper for API route handlers with rate limiting and error handling
 */
export function createApiHandler<T = any>(
  handler: (request: Request, context?: any) => Promise<T>,
  options: {
    rateLimitType?: 'auth' | 'api' | 'read' | 'sensitive'
    requireAuth?: boolean
  } = {}
) {
  return async (request: Request, context?: any): Promise<NextResponse<ApiResponse<T>>> => {
    try {
      // Apply rate limiting
      const { allowed, response } = await withRateLimit(request, options.rateLimitType || 'api')
      if (!allowed && response) {
        return response
      }
      
      // Execute handler
      const result = await handler(request, context)
      
      // Return success response
      return successResponse(result)
    } catch (error) {
      // Handle errors
      if (error instanceof Error) {
        // Check for known error types
        if (error.message.includes('rate limit')) {
          return errorResponse(error, 429)
        }
        if (error.message.includes('unauthorized') || error.message.includes('permission')) {
          return errorResponse(error, 403)
        }
        if (error.message.includes('not found')) {
          return errorResponse(error, 404)
        }
        if (error.message.includes('validation')) {
          return errorResponse(error, 400)
        }
      }
      
      // Generic error
      return errorResponse(error instanceof Error ? error : new Error('Internal server error'), 500)
    }
  }
}

