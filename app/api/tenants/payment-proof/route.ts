import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { withRateLimit, successResponse, errorResponse } from '@/lib/api-helpers'
import { validateFiles } from '@/lib/validation'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  // Apply rate limiting (sensitive operation)
  const { allowed, response } = await withRateLimit(request, 'sensitive')
  if (!allowed && response) return response

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const transactionId = formData.get('transactionId') as string
    const paymentDate = formData.get('paymentDate') as string
    const notes = formData.get('notes') as string

    if (!file) {
      return errorResponse('Payment proof file is required', 400)
    }

    // Validate file
    const fileValidation = validateFiles([file], {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
      maxFiles: 1,
    })

    if (!fileValidation.valid) {
      return errorResponse(fileValidation.errors?.join(', ') || 'Invalid file', 400)
    }

    // Get tenant ID for the user
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (tenantUserError) {
      logger.error('Error fetching tenant user', tenantUserError)
      return errorResponse(`Failed to verify tenant admin status: ${tenantUserError.message}`, 500)
    }

    if (!tenantUser || !tenantUser.tenant_id) {
      return errorResponse('You must be an admin to submit payment proof', 403)
    }

    const adminSupabase = createAdminClient()

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${tenantUser.tenant_id}/${Date.now()}.${fileExt}`
    const filePath = `payment-proofs/${fileName}`

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check if storage bucket exists, if not provide helpful error
    const { data: buckets, error: bucketsError } = await adminSupabase.storage.listBuckets()
    
    if (bucketsError) {
      logger.error('Error checking storage buckets', bucketsError)
    } else {
      const paymentProofsBucket = buckets?.find(b => b.name === 'payment-proofs')
      if (!paymentProofsBucket) {
        return errorResponse(
          'Storage bucket not configured. The payment-proofs storage bucket does not exist. Please create it in Supabase Dashboard → Storage.',
          500
        )
      }
    }

    // Upload to storage
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('payment-proofs')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      logger.error('Upload error', uploadError)
      
      // Provide more helpful error messages based on error type
      let errorMessage = 'Failed to upload file'
      
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
        errorMessage = 'Storage bucket not found. The payment-proofs storage bucket does not exist. Please create it in Supabase Dashboard → Storage.'
      } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
        errorMessage = 'Storage permission denied. The storage bucket exists but you do not have permission to upload. Please check bucket policies in Supabase.'
      }
      
      return errorResponse(errorMessage, 500)
    }

    // Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('payment-proofs')
      .getPublicUrl(filePath)

    // Create payment proof record
    const { data: paymentProof, error: proofError } = await adminSupabase
      .from('tenant_payment_proofs')
      .insert({
        tenant_id: tenantUser.tenant_id,
        admin_user_id: user.id,
        payment_proof_url: publicUrl,
        amount: 12000.00,
        currency: 'INR',
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        transaction_id: transactionId,
        notes: notes,
        status: 'pending'
      })
      .select()
      .single()

    if (proofError) {
      logger.error('Error creating payment proof record', proofError)
      // Delete uploaded file if record creation fails
      try {
        await adminSupabase.storage.from('payment-proofs').remove([filePath])
      } catch (deleteError) {
        logger.error('Failed to delete uploaded file', deleteError)
      }
      return errorResponse(`Failed to create payment proof record: ${proofError.message}`, 500)
    }

    // Send notification to super admins
    try {
      const { data: superAdmins } = await adminSupabase
        .from('super_admins')
        .select('user_id')

      if (superAdmins && superAdmins.length > 0) {
        const { data: tenant } = await adminSupabase
          .from('tenants')
          .select('name, tenant_code')
          .eq('id', tenantUser.tenant_id)
          .single()

        const notifications = superAdmins.map(sa => ({
          user_id: sa.user_id,
          title: 'New Payment Proof Submitted',
          message: `${tenant?.name || 'Tenant'} (${tenant?.tenant_code || 'N/A'}) has submitted payment proof. Transaction ID: ${transactionId || 'N/A'}`,
          type: 'info',
          read: false,
          priority: 2,
          action_url: `/admin/tenants/${tenantUser.tenant_id}`
        }))

        for (const notification of notifications) {
          try {
            await adminSupabase.from('notifications').insert(notification)
          } catch (err) {
            logger.error('Failed to send notification', err)
          }
        }
      }
    } catch (notificationError) {
      logger.error('Error sending notifications', notificationError)
    }

    return successResponse({
      payment_proof: paymentProof,
      message: 'Payment proof submitted successfully. It will be reviewed by super admin.'
    }, 'Payment proof submitted successfully')

  } catch (error: any) {
    logger.error('Unexpected error in payment proof submission', error)
    return errorResponse(error?.message || 'An unexpected error occurred', 500)
  }
}

// GET endpoint to fetch payment proofs for current tenant
export async function GET(request: Request) {
  // Apply rate limiting (read operation)
  const { allowed, response } = await withRateLimit(request, 'read')
  if (!allowed && response) return response

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Get tenant ID for the user
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tenantUserError) {
      logger.error('Error fetching tenant user', tenantUserError)
      return errorResponse(`Failed to verify tenant access: ${tenantUserError.message}`, 500)
    }

    if (!tenantUser || !tenantUser.tenant_id) {
      return errorResponse('Tenant not found', 404)
    }

    const { data: paymentProofs, error } = await supabase
      .from('tenant_payment_proofs')
      .select('*')
      .eq('tenant_id', tenantUser.tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching payment proofs', error)
      return errorResponse('Failed to fetch payment proofs', 500)
    }

    // Get tenant details and subscription information
    const { data: tenant } = await supabase
      .from('tenants')
      .select('trial_ends_at, is_active, subscription_status')
      .eq('id', tenantUser.tenant_id)
      .single()

    // Get subscription details including expiry date
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status, billing_period_start, billing_period_end, amount, currency')
      .eq('tenant_id', tenantUser.tenant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return successResponse({
      payment_proofs: paymentProofs || [],
      tenant: tenant,
      subscription: subscription || null
    })

  } catch (error: any) {
    logger.error('Error fetching payment proofs', error)
    return errorResponse('An unexpected error occurred', 500)
  }
}

