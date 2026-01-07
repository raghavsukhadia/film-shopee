'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    feedback: string
    color: string
  }>({ score: 0, feedback: '', color: '#9ca3af' })
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    if (!password) {
      return { score: 0, feedback: '', color: '#9ca3af' }
    }

    let score = 0
    let feedback = ''

    // Length check
    if (password.length >= 8) score += 1
    else if (password.length >= 6) score += 0.5
    else feedback = 'At least 6 characters required'

    // Has lowercase
    if (/[a-z]/.test(password)) score += 1
    else feedback = feedback || 'Add lowercase letters'

    // Has uppercase
    if (/[A-Z]/.test(password)) score += 1
    else feedback = feedback || 'Add uppercase letters'

    // Has numbers
    if (/[0-9]/.test(password)) score += 1
    else feedback = feedback || 'Add numbers'

    // Has special characters
    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    else feedback = feedback || 'Add special characters'

    let strength = ''
    let color = '#dc2626' // red

    if (score >= 4) {
      strength = 'Strong'
      color = '#10b981' // green
    } else if (score >= 2.5) {
      strength = 'Medium'
      color = '#f59e0b' // orange
    } else if (score >= 1) {
      strength = 'Weak'
      color = '#ef4444' // red
    } else {
      strength = 'Very Weak'
      color = '#dc2626' // dark red
    }

    return {
      score,
      feedback: feedback || strength,
      color,
      strength
    }
  }

  useEffect(() => {
    const strength = calculatePasswordStrength(newPassword)
    setPasswordStrength(strength)
  }, [newPassword])

  useEffect(() => {
    // Check if we have a valid session/token from the reset link
    const checkSession = async () => {
      try {
        // First, check if there's a hash in the URL (Supabase includes tokens in hash)
        const hash = window.location.hash
        
        if (hash) {
          // Supabase will automatically parse the hash and create a session
          // Wait a bit for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Check for session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (session && session.user) {
          setIsValidToken(true)
          return
        }

        // If we have a hash with access_token, try to process it
        if (hash && hash.includes('access_token')) {
          // Try to exchange the code for a session
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken && refreshToken) {
            // Set the session manually
            const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            
            if (sessionData.session) {
              setIsValidToken(true)
              return
            }
          }
          
          // If we have a hash but no session yet, wait a bit more
          await new Promise(resolve => setTimeout(resolve, 1000))
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession) {
            setIsValidToken(true)
            return
          }
        }
        
        // No valid session found
        setIsValidToken(false)
        setError('Invalid or expired reset link. Please request a new password reset.')
      } catch (err) {
        console.error('Error checking session:', err)
        setIsValidToken(false)
        setError('Unable to verify reset link. Please request a new password reset.')
      }
    }

    checkSession()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validation
      if (!newPassword || !confirmPassword) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters long')
        setLoading(false)
        return
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      // Check password strength (warn but don't block if weak)
      if (passwordStrength.score < 2) {
        setError('Password is too weak. Please use a stronger password with a mix of letters, numbers, and special characters.')
        setLoading(false)
        return
      }

      // Verify we still have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Your session has expired. Please request a new password reset link.')
        setIsValidToken(false)
        setLoading(false)
        return
      }

      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        if (updateError.message.includes('session')) {
          setError('Your session has expired. Please request a new password reset link.')
          setIsValidToken(false)
        } else {
          setError(updateError.message || 'Failed to update password. Please try again.')
        }
        setLoading(false)
        return
      }

      // Success
      setSuccess(true)
      setLoading(false)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login?passwordReset=success')
      }, 2000)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Show loading state while checking token
  if (isValidToken === null) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #f59e0b',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#6b7280' }}>Verifying reset link...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Show error if token is invalid
  if (isValidToken === false && !success) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ maxWidth: '28rem', width: '100%' }}>
          {/* Back to Login */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                color: '#f59e0b',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
              Back to Login
            </button>
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Logo size="large" showText={true} variant="dark" />
            </div>
          </div>

          {/* Error Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.875rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <AlertCircle style={{ width: '1rem', height: '1rem' }} />
              {error}
            </div>

            <button
              onClick={() => router.push('/forgot-password')}
              style={{
                width: '100%',
                height: '3rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                color: 'white',
                fontWeight: '500',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              Request New Reset Link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '28rem', width: '100%' }}>
        {/* Back to Login */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              color: '#f59e0b',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            Back to Login
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <Logo size="large" showText={true} variant="dark" />
          </div>
        </div>

        {/* Reset Password Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              textAlign: 'center',
              margin: '0 0 0.5rem 0',
              color: '#1f2937'
            }}>
              Set New Password
            </h2>
            <p style={{
              textAlign: 'center',
              color: '#6b7280',
              margin: '0',
              fontSize: '0.875rem'
            }}>
              Enter your new password below.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#166534',
              fontSize: '0.875rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <CheckCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  Password updated successfully!
                </div>
                <div style={{ fontSize: '0.8125rem' }}>
                  Redirecting to login page...
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.875rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <AlertCircle style={{ width: '1rem', height: '1rem' }} />
              {error}
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#9ca3af',
                    zIndex: 1
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    style={{
                      width: '100%',
                      height: '3rem',
                      padding: '0 2.75rem 0 2.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#9ca3af'
                    }}
                  >
                    {showPassword ? (
                      <EyeOff style={{ width: '1rem', height: '1rem' }} />
                    ) : (
                      <Eye style={{ width: '1rem', height: '1rem' }} />
                    )}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <div style={{
                        flex: 1,
                        height: '4px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(passwordStrength.score / 5) * 100}%`,
                          height: '100%',
                          backgroundColor: passwordStrength.color,
                          transition: 'all 0.3s ease'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: passwordStrength.color,
                        fontWeight: '600',
                        minWidth: '60px',
                        textAlign: 'right'
                      }}>
                        {passwordStrength.score >= 4 ? 'Strong' : 
                         passwordStrength.score >= 2.5 ? 'Medium' : 
                         passwordStrength.score >= 1 ? 'Weak' : 'Very Weak'}
                      </span>
                    </div>
                    {passwordStrength.feedback && passwordStrength.score < 4 && (
                      <p style={{
                        fontSize: '0.75rem',
                        color: passwordStrength.color,
                        margin: 0
                      }}>
                        {passwordStrength.feedback}
                      </p>
                    )}
                  </div>
                )}
                {!newPassword && (
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
                    Must be at least 6 characters long. Use a mix of letters, numbers, and special characters for better security.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Confirm Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#9ca3af',
                    zIndex: 1
                  }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    style={{
                      width: '100%',
                      height: '3rem',
                      padding: '0 2.75rem 0 2.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#9ca3af'
                    }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff style={{ width: '1rem', height: '1rem' }} />
                    ) : (
                      <Eye style={{ width: '1rem', height: '1rem' }} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '3rem',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  color: 'white',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock style={{ width: '1rem', height: '1rem' }} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

