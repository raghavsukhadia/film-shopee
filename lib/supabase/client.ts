import { createBrowserClient } from '@supabase/ssr'
import { isRefreshTokenError } from '@/lib/auth-error-handler'

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle auth state changes and refresh token errors
  client.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      // Session refreshed or signed out - this is normal
      return
    }
    
    if (event === 'SIGNED_IN') {
      // User signed in - session is valid
      return
    }
    
    // Handle token refresh errors
    if (event === 'TOKEN_REFRESHED' && !session) {
      // Token refresh failed - clear session and redirect
      try {
        await client.auth.signOut()
        sessionStorage.clear()
        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login'
        }
      } catch (error) {
        console.error('Error handling token refresh failure:', error)
      }
    }
  })

  // Intercept auth errors globally
  const originalGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async () => {
    try {
      return await originalGetUser()
    } catch (error: any) {
      if (isRefreshTokenError(error)) {
        console.warn('Refresh token error in getUser, clearing session')
        try {
          await client.auth.signOut()
          sessionStorage.clear()
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login'
          }
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
        }
      }
      throw error
    }
  }

  return client
}
