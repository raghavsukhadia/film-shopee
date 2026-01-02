import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { withRateLimit, successResponse, errorResponse } from '@/lib/api-helpers'
import { validateRequestBody, commonSchemas } from '@/lib/validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const forgotPasswordSchema = z.object({
  email: commonSchemas.email,
})

export async function POST(request: Request) {
  // Apply rate limiting (strict for auth endpoints)
  const { allowed, response } = await withRateLimit(request, 'auth')
  if (!allowed && response) return response

  try {
    // Validate request body
    const validation = await validateRequestBody(request, forgotPasswordSchema)
    if (!validation.success) {
      return errorResponse(validation.error, 400)
    }

    const { email } = validation.data
    const normalizedEmail = email.toLowerCase().trim()


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
            return successResponse({
              message: 'If an account exists with this email, a password reset link has been sent.'
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
        return successResponse({
          message: 'If an account exists with this email, a password reset link has been sent.'
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
      logger.error('Error generating reset link', resetError)
      return errorResponse(
        `Failed to send password reset email: ${resetError.message || 'Please try again later.'}`,
        500
      )
    }

    // Success - return success message (don't reveal if email exists)
    return successResponse({
      message: 'If an account exists with this email, a password reset link has been sent.'
    })
  } catch (error: any) {
    logger.error('Error in forgot-password route', error)
    return errorResponse(error.message || 'An unexpected error occurred', 500)
  }
}

