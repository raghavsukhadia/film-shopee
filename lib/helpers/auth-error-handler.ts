import { AuthError } from '@supabase/supabase-js'

/**
 * Check if an error is a refresh token error or session expiration error
 */
export function isRefreshTokenError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code?.toLowerCase() || ''
  
  return (
    errorMessage.includes('refresh token') ||
    errorMessage.includes('refresh_token') ||
    errorMessage.includes('jwt') ||
    errorMessage.includes('session') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('expiration') ||
    errorCode === 'invalid_refresh_token' ||
    errorCode === 'token_not_found' ||
    errorCode === 'session_not_found' ||
    errorCode === 'invalid_jwt'
  )
}

/**
 * Check if a session is expired
 */
export function isSessionExpired(session: any): boolean {
  if (!session || !session.expires_at) return true
  
  // expires_at is in seconds, convert to milliseconds
  const expiresAt = session.expires_at * 1000
  const now = Date.now()
  
  // Add 5 second buffer to account for clock skew
  return now >= (expiresAt - 5000)
}

/**
 * Handle authentication errors, especially refresh token errors
 * Returns true if the error was handled (user should be redirected)
 */
export async function handleAuthError(
  error: any,
  supabase: any,
  redirectToLogin: () => void
): Promise<boolean> {
  if (!error) return false

  // Check if it's a refresh token error
  if (isRefreshTokenError(error)) {
    console.warn('Refresh token error detected:', error.message)
    
    try {
      // Clear invalid session
      await supabase.auth.signOut()
    } catch (signOutError) {
      console.error('Error signing out:', signOutError)
    }
    
    // Clear session storage
    try {
      sessionStorage.clear()
    } catch (e) {
      // Session storage might not be available in some contexts
      console.warn('Could not clear session storage:', e)
    }
    
    // Redirect to login
    redirectToLogin()
    return true
  }

  return false
}

/**
 * Safely get user with error handling for refresh token errors and session expiration
 */
export async function safeGetUser(supabase: any, redirectToLogin: () => void) {
  try {
    const { data: { user, session }, error } = await supabase.auth.getUser()
    
    if (error) {
      const handled = await handleAuthError(error, supabase, redirectToLogin)
      if (handled) {
        return { user: null, error: null }
      }
    }
    
    // Check if session is expired even if no error occurred
    if (session && isSessionExpired(session)) {
      console.warn('Session expired in safeGetUser, clearing session')
      try {
        await supabase.auth.signOut()
        sessionStorage.clear()
        redirectToLogin()
      } catch (signOutError) {
        console.error('Error signing out expired session:', signOutError)
      }
      return { user: null, error: null }
    }
    
    return { user, error }
  } catch (err: any) {
    const handled = await handleAuthError(err, supabase, redirectToLogin)
    if (handled) {
      return { user: null, error: null }
    }
    return { user: null, error: err }
  }
}

/**
 * Server-side: Safely get user with session expiration check for API routes
 * Returns null user if session is expired or invalid
 */
export async function safeGetUserServer(supabase: any) {
  try {
    const { data: { user, session }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Check if it's a session expiration error
      if (isRefreshTokenError(error)) {
        return { user: null, session: null, error: { message: 'Session expired', code: 'SESSION_EXPIRED' } }
      }
      return { user: null, session: null, error }
    }
    
    // Check if session is expired even if no error occurred
    if (session && isSessionExpired(session)) {
      return { user: null, session: null, error: { message: 'Session expired', code: 'SESSION_EXPIRED' } }
    }
    
    return { user, session, error: null }
  } catch (err: any) {
    if (isRefreshTokenError(err)) {
      return { user: null, session: null, error: { message: 'Session expired', code: 'SESSION_EXPIRED' } }
    }
    return { user: null, session: null, error: err }
  }
}

