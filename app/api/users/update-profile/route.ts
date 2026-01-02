import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { withRateLimit, successResponse, errorResponse } from '@/lib/api-helpers'
import { validateRequestBody, commonSchemas } from '@/lib/validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const updateProfileSchema = z.object({
  userId: commonSchemas.uuid,
  name: z.string().min(1).optional(),
  email: commonSchemas.email.optional(),
  phone: commonSchemas.phone.optional(),
  password: z.string().min(8).optional(),
  designation: z.string().optional(),
  bio: z.string().optional(),
  joinDate: z.string().optional(),
})

export async function POST(request: Request) {
  // Apply rate limiting (sensitive operation)
  const { allowed, response } = await withRateLimit(request, 'sensitive')
  if (!allowed && response) return response

  try {
    // Validate request body
    const validation = await validateRequestBody(request, updateProfileSchema)
    if (!validation.success) {
      return errorResponse(validation.error, 400)
    }

    const { userId, name, email, phone, password, designation, bio, joinDate } = validation.data

    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return errorResponse('Server configuration error: SUPABASE_SERVICE_ROLE_KEY not found', 500)
    }

    const adminSupabase = createAdminClient()

    // Prepare update payload for auth user
    const authUpdatePayload: any = {}
    if (name) authUpdatePayload.user_metadata = { ...authUpdatePayload.user_metadata, name }
    if (email) authUpdatePayload.email = email
    if (password) authUpdatePayload.password = password

    // Update auth user
    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authError } = await adminSupabase.auth.admin.updateUserById(
        userId,
        authUpdatePayload
      )

      if (authError) {
        logger.error('Error updating auth user', authError)
        return errorResponse(`Failed to update auth user: ${authError.message}`, 400)
      }
    }

    // Prepare update payload for profile
    const profileUpdatePayload: any = {}
    if (name) profileUpdatePayload.name = name
    if (email) profileUpdatePayload.email = email
    if (phone) profileUpdatePayload.phone = phone

    // Update profile table
    if (Object.keys(profileUpdatePayload).length > 0) {
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .update(profileUpdatePayload)
        .eq('id', userId)

      if (profileError) {
        logger.error('Error updating profile', profileError)
        // Don't fail if profile update fails, auth update succeeded
      }
    }

    // Update system settings for profile
    const profileSettings = []
    if (designation !== undefined) {
      profileSettings.push({
        setting_key: 'profile_designation',
        setting_value: designation,
        setting_group: 'profile'
      })
    }
    if (bio !== undefined) {
      profileSettings.push({
        setting_key: 'profile_bio',
        setting_value: bio,
        setting_group: 'profile'
      })
    }
    if (joinDate !== undefined) {
      profileSettings.push({
        setting_key: 'profile_join_date',
        setting_value: joinDate,
        setting_group: 'profile'
      })
    }

    for (const setting of profileSettings) {
      await adminSupabase
        .from('system_settings')
        .upsert(setting, { onConflict: 'setting_key' })
    }

    return successResponse({ message: 'Profile updated successfully' })
  } catch (error: any) {
    logger.error('Error in profile update', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

