'use client'

import { useEffect, useRef } from 'react'
import { logger } from '@/lib/utils/logger'

interface UseFormAutoSaveOptions {
  formKey: string
  data: any
  enabled?: boolean
  debounceMs?: number
}

/**
 * Auto-save form data to localStorage with debouncing
 */
export function useFormAutoSave({ 
  formKey, 
  data, 
  enabled = true,
  debounceMs = 1000 
}: UseFormAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    if (!enabled || !data) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce the save operation
    timeoutRef.current = setTimeout(() => {
      try {
        const dataString = JSON.stringify(data)
        
        // Only save if data has changed
        if (dataString !== lastSavedRef.current) {
          localStorage.setItem(`form_autosave_${formKey}`, dataString)
          lastSavedRef.current = dataString
          logger.debug(`Auto-saved form: ${formKey}`, undefined, 'useFormAutoSave')
        }
      } catch (error) {
        logger.error('Error auto-saving form', error, 'useFormAutoSave')
      }
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, formKey, enabled, debounceMs])

  // Function to restore saved data
  const restoreSavedData = (): any => {
    try {
      const saved = localStorage.getItem(`form_autosave_${formKey}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        logger.debug(`Restored saved form: ${formKey}`, undefined, 'useFormAutoSave')
        return parsed
      }
    } catch (error) {
      logger.error('Error restoring saved form', error, 'useFormAutoSave')
    }
    return null
  }

  // Function to clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(`form_autosave_${formKey}`)
      lastSavedRef.current = ''
      logger.debug(`Cleared saved form: ${formKey}`, undefined, 'useFormAutoSave')
    } catch (error) {
      logger.error('Error clearing saved form', error, 'useFormAutoSave')
    }
  }

  return {
    restoreSavedData,
    clearSavedData
  }
}

