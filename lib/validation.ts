/**
 * Input Validation & Sanitization Utilities
 * 
 * Provides validation and sanitization functions for user inputs
 * to prevent XSS attacks and ensure data integrity.
 */

import { z } from 'zod'
import { logger } from './logger'

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value) as any
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value) as any
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item) : item
      ) as any
    }
  }

  return sanitized
}

/**
 * Validate and sanitize request body
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const sanitized = sanitizeObject(body)
    const result = schema.safeParse(sanitized)

    if (!result.success) {
      logger.warn('Validation failed', {
        errors: result.error.errors,
        path: new URL(request.url).pathname,
      })

      return {
        success: false,
        error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    logger.error('Failed to parse request body', error)
    return {
      success: false,
      error: 'Invalid request body',
    }
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number'),
  uuid: z.string().uuid('Invalid UUID format'),
  url: z.string().url('Invalid URL format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonEmptyString: z.string().min(1, 'Cannot be empty'),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  timeString: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
}

/**
 * File upload validation
 */
export interface FileValidationOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  maxFiles?: number
}

export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    maxFiles = 1,
  } = options

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
    }
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  options: FileValidationOptions = {}
): { valid: boolean; errors?: string[] } {
  const { maxFiles = 10 } = options
  const errors: string[] = []

  // Check number of files
  if (files.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed`)
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file, options)
    if (!result.valid) {
      errors.push(`${file.name}: ${result.error}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

