import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Rate limiting: Max 3 requests per email per hour
const MAX_REQUESTS_PER_HOUR = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// In-memory rate limit store (for production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes

function checkRateLimit(email: string): { allowed: boolean; remaining: number; resetAt: number } {
  const normalizedEmail = email.toLowerCase().trim()
  const now = Date.now()
  const key = `password_reset:${normalizedEmail}`
  
  const limit = rateLimitStore.get(key)
  
  if (!limit || limit.resetAt < now) {
    // No limit or expired, create new limit
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    })
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_HOUR - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    }
  }
  
  if (limit.count >= MAX_REQUESTS_PER_HOUR) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: limit.resetAt
    }
  }
  
  // Increment count
  limit.count++
  rateLimitStore.set(key, limit)
  
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_HOUR - limit.count,
    resetAt: limit.resetAt
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(normalizedEmail)
    if (!rateLimit.allowed) {
      const minutesUntilReset = Math.ceil((rateLimit.resetAt - Date.now()) / (60 * 1000))
      return NextResponse.json({
        error: 'Too many password reset requests',
        message: `You have exceeded the maximum number of password reset requests. Please wait ${minutesUntilReset} minute(s) before trying again.`,
        rateLimitExceeded: true,
        resetAt: rateLimit.resetAt
      }, { status: 429 })
    }

    // Check if email exists
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
      // Try admin client first for more reliable checking
      const adminSupabase = createAdminClient()
      const { data: users } = await adminSupabase.auth.admin.listUsers()
      
      if (users) {
        const userExists = users.users.some(user => 
          user.email?.toLowerCase().trim() === normalizedEmail
        )
        
        if (!userExists) {
          // Check profiles table as fallback
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', normalizedEmail)
            .maybeSingle()
          
          if (!profile) {
            // Don't reveal if email exists (security best practice)
            // But still respect rate limiting
            return NextResponse.json({
              success: true,
              message: 'If an account exists with this email, a password reset link has been sent.',
              rateLimitRemaining: rateLimit.remaining
            })
          }
        }
      }
    } catch (checkError) {
      // Fallback to profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle()
      
      if (!profile) {
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
          rateLimitRemaining: rateLimit.remaining
        })
      }
    }

    // Get site URL for redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // Send password reset email using admin client
    const adminSupabase = createAdminClient()
    const { error: resetError } = await adminSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/reset-password`
      }
    })

    if (resetError) {
      console.error('Error generating reset link:', resetError)
      return NextResponse.json({
        error: 'Failed to send password reset email',
        message: resetError.message || 'Please try again later.'
      }, { status: 500 })
    }

    // Success - return success message (don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      rateLimitRemaining: rateLimit.remaining
    })
  } catch (error: any) {
    console.error('Error in forgot-password route:', error)
    return NextResponse.json({
      error: 'An unexpected error occurred',
      message: error.message || 'Please try again later.'
    }, { status: 500 })
  }
}

