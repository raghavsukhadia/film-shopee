import { createBrowserClient } from '@supabase/ssr'
import { isRefreshTokenError, isSessionExpired } from '@/lib/helpers/auth-error-handler'

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle auth state changes and session expiration
  client.auth.onAuthStateChange(async (event, session) => {
    // Handle session expiration
    if (session && isSessionExpired(session)) {
      console.warn('Session expired, signing out and redirecting to login')
      try {
        await client.auth.signOut()
        sessionStorage.clear()
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login'
        }
      } catch (error) {
        console.error('Error handling session expiration:', error)
      }
      return
    }

    if (event === 'SIGNED_OUT') {
      // User signed out - clear session storage and redirect to login if not already there
      try {
        sessionStorage.clear()
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login'
        }
      } catch (error) {
        console.error('Error handling sign out:', error)
      }
      return
    }
    
    if (event === 'TOKEN_REFRESHED') {
      // Session refreshed - check if it's still valid
      if (!session || isSessionExpired(session)) {
        console.warn('Token refreshed but session is expired, signing out')
        try {
          await client.auth.signOut()
          sessionStorage.clear()
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login'
          }
        } catch (error) {
          console.error('Error handling expired refreshed token:', error)
        }
      }
      return
    }
    
    if (event === 'SIGNED_IN') {
      // User signed in - verify session is valid
      if (session && isSessionExpired(session)) {
        console.warn('Session expired immediately after sign in, signing out')
        try {
          await client.auth.signOut()
          sessionStorage.clear()
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login'
          }
        } catch (error) {
          console.error('Error handling expired session on sign in:', error)
        }
      }
      return
    }
  })

  // Intercept auth errors globally and check session expiration
  const originalGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async () => {
    try {
      const result = await originalGetUser()
      
      // Check if session is expired even if getUser succeeded
      if (result.data?.session && isSessionExpired(result.data.session)) {
        console.warn('Session expired in getUser, clearing session')
        try {
          await client.auth.signOut()
          sessionStorage.clear()
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login'
          }
        } catch (signOutError) {
          console.error('Error signing out expired session:', signOutError)
        }
        // Return null user to indicate session expired
        return { data: { user: null, session: null }, error: null }
      }
      
      return result
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
