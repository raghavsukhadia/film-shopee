import { AuthError } from '@supabase/supabase-js'

/**
 * Check if an error is a refresh token error
 */
export function isRefreshTokenError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code?.toLowerCase() || ''
  
  return (
    errorMessage.includes('refresh token') ||
    errorMessage.includes('refresh_token') ||
    errorMessage.includes('jwt') ||
    errorCode === 'invalid_refresh_token' ||
    errorCode === 'token_not_found'
  )
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
 * Safely get user with error handling for refresh token errors
 */
export async function safeGetUser(supabase: any, redirectToLogin: () => void) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      const handled = await handleAuthError(error, supabase, redirectToLogin)
      if (handled) {
        return { user: null, error: null }
      }
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

