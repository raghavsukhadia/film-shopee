/**
 * Error handling utilities
 * Standardized error handling and formatting
 */

export interface AppError {
  message: string
  code?: string
  statusCode?: number
  details?: any
}

/**
 * Create a standardized error object
 */
export function createError(
  message: string,
  code?: string,
  statusCode?: number,
  details?: any
): AppError {
  return {
    message,
    code,
    statusCode,
    details
  }
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: any): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    // Don't expose stack traces to users
    return error.message || 'An unexpected error occurred'
  }

  if (error?.message) {
    return error.message
  }

  if (error?.error) {
    return typeof error.error === 'string' ? error.error : error.error.message || 'An error occurred'
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.code === 'NETWORK_ERROR' ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.name === 'NetworkError'
  )
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return (
    error?.code === 'PGRST301' ||
    error?.status === 401 ||
    error?.statusCode === 401 ||
    error?.message?.toLowerCase().includes('auth') ||
    error?.message?.toLowerCase().includes('unauthorized')
  )
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  return (
    error?.code === '23505' || // PostgreSQL unique violation
    error?.code === '23503' || // PostgreSQL foreign key violation
    error?.code === '42703' || // PostgreSQL undefined column
    error?.status === 400 ||
    error?.statusCode === 400 ||
    error?.message?.toLowerCase().includes('validation') ||
    error?.message?.toLowerCase().includes('invalid')
  )
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyError(error: any): string {
  if (isNetworkError(error)) {
    return 'Network error. Please check your internet connection and try again.'
  }

  if (isAuthError(error)) {
    return 'Authentication error. Please log in again.'
  }

  if (isValidationError(error)) {
    if (error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
      return 'This record already exists. Please check for duplicates.'
    }
    return 'Invalid data. Please check your input and try again.'
  }

  return formatErrorForUser(error)
}

/**
 * Handle API error response
 */
export function handleApiError(response: Response, data?: any): AppError {
  const statusCode = response.status
  let message = 'An error occurred'

  if (data?.error) {
    message = typeof data.error === 'string' ? data.error : data.error.message || message
  } else if (data?.message) {
    message = data.message
  } else {
    // Default messages based on status code
    switch (statusCode) {
      case 400:
        message = 'Invalid request. Please check your input.'
        break
      case 401:
        message = 'Authentication required. Please log in.'
        break
      case 403:
        message = 'You do not have permission to perform this action.'
        break
      case 404:
        message = 'Resource not found.'
        break
      case 500:
        message = 'Server error. Please try again later.'
        break
      default:
        message = `Error ${statusCode}. Please try again.`
    }
  }

  return createError(message, data?.code, statusCode, data?.details)
}

