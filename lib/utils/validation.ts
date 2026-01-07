/**
 * Validation utilities
 * Centralized validation functions for forms and data
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: true } // Email is optional in most forms
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValid = emailRegex.test(email.trim().toLowerCase())

  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid email address'
  }
}

/**
 * Validate phone number (Indian format)
 */
export function validatePhone(phone: string, required: boolean = true): ValidationResult {
  if (!phone || phone.trim() === '') {
    return required
      ? { isValid: false, error: 'Phone number is required' }
      : { isValid: true }
  }

  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '')
  
  // Indian phone numbers: 10 digits
  const isValid = digitsOnly.length === 10

  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid 10-digit phone number'
  }
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string = 'Field'): ValidationResult {
  const isValid = value !== null && value !== undefined && value.trim() !== ''

  return {
    isValid,
    error: isValid ? undefined : `${fieldName} is required`
  }
}

/**
 * Validate vehicle registration number (Indian format)
 */
export function validateVehicleNumber(vehicleNumber: string): ValidationResult {
  if (!vehicleNumber || vehicleNumber.trim() === '') {
    return { isValid: false, error: 'Vehicle number is required' }
  }

  // Basic validation: should be uppercase, alphanumeric, 8-15 characters
  const cleaned = vehicleNumber.trim().toUpperCase()
  const isValid = /^[A-Z0-9]{8,15}$/.test(cleaned)

  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid vehicle registration number'
  }
}

/**
 * Validate numeric value
 */
export function validateNumber(value: string, min?: number, max?: number): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true } // Numbers are often optional
  }

  const num = parseFloat(value)
  const isValid = !isNaN(num) && isFinite(num)

  if (!isValid) {
    return { isValid: false, error: 'Please enter a valid number' }
  }

  if (min !== undefined && num < min) {
    return { isValid: false, error: `Value must be at least ${min}` }
  }

  if (max !== undefined && num > max) {
    return { isValid: false, error: `Value must be at most ${max}` }
  }

  return { isValid: true }
}

/**
 * Validate year (for vehicle year)
 */
export function validateYear(year: string): ValidationResult {
  if (!year || year.trim() === '') {
    return { isValid: true } // Year is optional
  }

  const currentYear = new Date().getFullYear()
  const minYear = 1950
  const maxYear = currentYear + 1 // Allow next year for new vehicles

  return validateNumber(year, minYear, maxYear)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string, minLength: number = 8): ValidationResult {
  if (!password || password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters long`
    }
  }

  return { isValid: true }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { isValid: true } // URL is often optional
  }

  try {
    new URL(url)
    return { isValid: true }
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' }
  }
}

/**
 * Validate multiple fields at once
 */
export function validateFields(
  fields: Record<string, { value: string; validators: ((value: string) => ValidationResult)[] }>
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {}

  for (const [fieldName, { value, validators }] of Object.entries(fields)) {
    for (const validator of validators) {
      const result = validator(value)
      if (!result.isValid && result.error) {
        errors[fieldName] = result.error
        break // Stop at first error
      }
    }
  }

  return errors
}

