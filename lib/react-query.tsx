'use client'

/**
 * React Query Provider Setup
 * 
 * Provides React Query configuration for data fetching, caching, and optimistic updates.
 * 
 * Note: Install @tanstack/react-query first:
 * npm install @tanstack/react-query
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState } from 'react'

// Create a default query client with optimized settings
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep unused data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests 3 times
        retry: 3,
        // Retry delay increases exponentially
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus in production
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        // Don't refetch on mount if data is fresh
        refetchOnMount: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  })
}

interface ReactQueryProviderProps {
  children: ReactNode
}

/**
 * React Query Provider Component
 * 
 * Wrap your app with this provider to enable React Query functionality.
 * 
 * Usage:
 * ```tsx
 * <ReactQueryProvider>
 *   <App />
 * </ReactQueryProvider>
 * ```
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Create query client with useState to ensure it's only created once
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

// Export query client factory for use in other files
export { createQueryClient }

