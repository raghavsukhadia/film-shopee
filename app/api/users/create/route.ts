import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { withRateLimit, successResponse, errorResponse } from '@/lib/api-helpers'
import { validateRequestBody, commonSchemas } from '@/lib/validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createUserSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(8).optional(),
  name: commonSchemas.nonEmptyString,
  phone: commonSchemas.phone,
  role: z.enum(['admin', 'manager', 'coordinator', 'installer', 'accountant']),
  department: z.string().optional(),
  departments: z.array(z.string()).optional(),
  specialization: z.string().optional(),
  tenant_id: commonSchemas.uuid.optional(),
})

export async function POST(request: Request) {
  // Apply rate limiting (sensitive operation)
  const { allowed, response } = await withRateLimit(request, 'sensitive')
  if (!allowed && response) return response

  try {
    logger.info('User creation request received')

    // Validate request body
    const validation = await validateRequestBody(request, createUserSchema)
    if (!validation.success) {
      return errorResponse(validation.error, 400)
    }

    const { email, password, name, phone, role, department, departments, specialization, tenant_id } = validation.data

    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return errorResponse('Server configuration error: SUPABASE_SERVICE_ROLE_KEY not found', 500)
    }

    // Create auth user using Supabase Admin API (requires service_role key)
    let adminSupabase
    try {
      adminSupabase = createAdminClient()
      logger.info('Admin client created successfully')
    } catch (error: any) {
      logger.error('Admin client error', error)
      return errorResponse(`Server configuration error: ${error.message}`, 500)
    }
    
    // Try to create the user WITHOUT the trigger (temporarily disable it)
    const { data: authData, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password: password || `${email}123!`, // Default password if not provided
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role,
        phone
      }
    })

    if (createError) {
      logger.error('Error creating auth user', createError)
      return errorResponse(`Failed to create user: ${createError.message}`, 400)
    }

    if (!authData.user) {
      return errorResponse('Failed to create user', 500)
    }

    logger.info('Auth user created', { userId: authData.user.id })

    // Wait a bit to ensure auth user is fully created
    await new Promise(resolve => setTimeout(resolve, 300))

    // Prepare profile data with all fields including departments
    const profileData: any = {
      id: authData.user.id,
      email,
      name,
      role,
      phone
    }
    
    // Add department information to initial profile creation
    if (departments && Array.isArray(departments) && departments.length > 0) {
      // Try setting a JSON/array column named `departments`; fallback to comma string in `department`
      profileData.departments = departments
      // Also set department as comma-separated string for backward compatibility
      profileData.department = departments.join(', ')
    } else if (department) {
      profileData.department = department
    }
    
    if (specialization) {
      profileData.specialization = specialization
    }

    // Create profile manually using admin client with all fields
    const { error: profileCreateError } = await adminSupabase
      .from('profiles')
      .insert(profileData)

    if (profileCreateError) {
      logger.error('Error creating profile', profileCreateError)
      // Don't delete the auth user - profile creation might fail but user exists
      logger.warn('Profile creation failed but auth user was created', { userId: authData.user.id })
      
      // Try to update profile if creation failed (might already exist)
      if (departments && Array.isArray(departments) && departments.length > 0) {
        const updateData: any = {
          departments: departments,
          department: departments.join(', ')
        }
        if (specialization) updateData.specialization = specialization
        
        const { error: updateError } = await adminSupabase
          .from('profiles')
          .update(updateData)
          .eq('id', authData.user.id)
        
        if (updateError) {
          logger.error('Error updating profile with departments', updateError)
        } else {
          logger.info('Profile updated with departments successfully')
        }
      }
    } else {
      logger.info('Profile created successfully with all fields')
    }

    // Create tenant_users relationship if tenant_id is provided
    if (tenant_id) {
      const { error: tenantUserError } = await adminSupabase
        .from('tenant_users')
        .insert({
          tenant_id: tenant_id,
          user_id: authData.user.id,
          role: role
        })

      if (tenantUserError) {
        logger.error('Error creating tenant_users relationship', tenantUserError)
        // Don't fail the request - user is created, just not linked to tenant
        logger.warn('Tenant user relationship creation failed but user was created', { userId: authData.user.id })
      } else {
        logger.info('Tenant user relationship created successfully')
      }
    }

    return successResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role
      }
    })
  } catch (error: any) {
    logger.error('Error in user creation', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
