import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withRateLimit, successResponse, errorResponse } from '@/lib/api-helpers'
import { validateRequestBody, commonSchemas } from '@/lib/validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const deleteUserSchema = z.object({
  userId: commonSchemas.uuid,
})

export async function POST(request: Request) {
  // Apply rate limiting (sensitive operation)
  const { allowed, response } = await withRateLimit(request, 'sensitive')
  if (!allowed && response) return response

  try {
    // Validate request body
    const validation = await validateRequestBody(request, deleteUserSchema)
    if (!validation.success) {
      return errorResponse(validation.error, 400)
    }

    const { userId } = validation.data

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return errorResponse('Server not configured', 500)
    }

    const admin = createAdminClient()

    // Delete from auth first
    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) {
      // Continue best-effort - some environments restrict auth delete; we still remove profile
      logger.warn('Auth delete failed', { error: authError.message })
    }

    // Delete profile row
    const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)
    if (profileError) {
      logger.error('Error deleting profile', profileError)
      return errorResponse(profileError.message, 400)
    }

    return successResponse({ message: 'User deleted successfully' })
  } catch (e: any) {
    logger.error('Error in user deletion', e)
    return errorResponse(e.message || 'Unknown error', 500)
  }
}


