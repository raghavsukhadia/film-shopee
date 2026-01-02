import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { withRateLimit, successResponse, errorResponse } from '@/lib/api-helpers'
import { validateRequestBody, commonSchemas } from '@/lib/validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const resetPasswordSchema = z.object({
  email: commonSchemas.email,
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  // Apply rate limiting (sensitive operation)
  const { allowed, response } = await withRateLimit(request, 'sensitive')
  if (!allowed && response) return response

  try {
    // Validate request body
    const validation = await validateRequestBody(request, resetPasswordSchema)
    if (!validation.success) {
      return errorResponse(validation.error, 400)
    }

    const { email, newPassword } = validation.data

    // Use admin client to update password
    const adminSupabase = createAdminClient()

    // Update the user's password
    const { data, error } = await adminSupabase.auth.admin.updateUserById(
      email, // Need to get user ID by email first
      { password: newPassword }
    )

    if (error) {
      logger.error('Error updating password', error)
      return errorResponse(error.message, 400)
    }

    return successResponse({ message: 'Password updated successfully' })
  } catch (error: any) {
    logger.error('Error in password reset', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
