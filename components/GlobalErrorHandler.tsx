'use client'

import { useEffect } from 'react'
import { setupGlobalErrorHandler } from './ErrorBoundary'

/**
 * Global Error Handler Component
 * 
 * Sets up global error handlers for unhandled errors and promise rejections.
 * Should be placed at the root of the application.
 */
export default function GlobalErrorHandler() {
  useEffect(() => {
    setupGlobalErrorHandler()
  }, [])

  return null
}

