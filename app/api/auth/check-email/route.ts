import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { withRateLimit, successResponse, errorResponse } from '@/lib/api-helpers'
import { validateRequestBody, commonSchemas } from '@/lib/validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const checkEmailSchema = z.object({
  email: commonSchemas.email,
})

export async function POST(request: Request) {
  // Apply rate limiting (strict for auth endpoints)
  const { allowed, response } = await withRateLimit(request, 'auth')
  if (!allowed && response) return response

  try {
    // Validate request body
    const validation = await validateRequestBody(request, checkEmailSchema)
    if (!validation.success) {
      return errorResponse(validation.error, 400)
    }

    const { email } = validation.data

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      // Invalid email format - return false for security (don't reveal format issues)
      return NextResponse.json({ exists: false })
    }

    try {
      // First, try to check auth.users directly using admin client (most reliable)
      const adminSupabase = createAdminClient()
      
      // List users and check if email exists
      // Note: Supabase Admin API doesn't have a direct "get user by email" method
      // So we'll use the profiles table as primary check, but with admin client for better reliability
      const { data: users, error: adminError } = await adminSupabase.auth.admin.listUsers()
      
      if (!adminError && users) {
        // Check if email exists in auth.users
        const userExists = users.users.some(user => 
          user.email?.toLowerCase().trim() === normalizedEmail
        )
        
        if (userExists) {
          return NextResponse.json({ exists: true })
        }
      }
    } catch (adminError) {
      // If admin client fails, fall back to profiles table check
      logger.warn('Admin client check failed, falling back to profiles table', { error: adminError })
    }

    // Fallback: Check profiles table using regular client
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (profileError) {
      logger.error('Error checking email in profiles', profileError)
      // If there's an error querying, we'll assume the email doesn't exist for security
      // This prevents email enumeration attacks
      return successResponse({ exists: false })
    }

    // Return true if profile exists, false otherwise
    return successResponse({ exists: !!profile })
  } catch (error: any) {
    logger.error('Error in check-email route', error)
    // On error, return false to be safe (prevents email enumeration)
    return successResponse({ exists: false })
  }
}

