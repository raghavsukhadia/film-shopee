import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: 'Payment proof file is required' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Get tenant ID for the user
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (tenantUserError) {
      console.error('Error fetching tenant user:', tenantUserError)
      return NextResponse.json(
        { error: 'Failed to verify tenant admin status', details: tenantUserError.message },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    if (!tenantUser || !tenantUser.tenant_id) {
      return NextResponse.json(
        { error: 'You must be an admin to submit payment proof' },
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
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
      console.error('Error checking storage buckets:', bucketsError)
    } else {
      const paymentProofsBucket = buckets?.find(b => b.name === 'payment-proofs')
      if (!paymentProofsBucket) {
        return NextResponse.json(
          { 
            error: 'Storage bucket not configured', 
            details: 'The payment-proofs storage bucket does not exist. Please create it in Supabase Dashboard → Storage.',
            help: 'Create a bucket named "payment-proofs" in Supabase Storage and set it to public or configure RLS policies.'
          },
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          }
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
      console.error('Upload error:', uploadError)
      
      // Provide more helpful error messages based on error type
      let errorMessage = 'Failed to upload file'
      let errorDetails = uploadError.message
      
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
        errorMessage = 'Storage bucket not found'
        errorDetails = 'The payment-proofs storage bucket does not exist. Please create it in Supabase Dashboard → Storage.'
      } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
        errorMessage = 'Storage permission denied'
        errorDetails = 'The storage bucket exists but you do not have permission to upload. Please check bucket policies in Supabase.'
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: errorDetails,
          originalError: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
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
      console.error('Error creating payment proof record:', proofError)
      // Delete uploaded file if record creation fails
      try {
        await adminSupabase.storage.from('payment-proofs').remove([filePath])
      } catch (deleteError) {
        console.error('Failed to delete uploaded file:', deleteError)
      }
      return NextResponse.json(
        { error: 'Failed to create payment proof record', details: proofError.message },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
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
            console.error('Failed to send notification:', err)
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError)
    }

    return NextResponse.json({
      success: true,
      payment_proof: paymentProof,
      message: 'Payment proof submitted successfully. It will be reviewed by super admin.'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Unexpected error in payment proof submission:', error)
    // Ensure we always return JSON, even for unexpected errors
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred', 
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

// GET endpoint to fetch payment proofs for current tenant
export async function GET(request: Request) {
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
      console.error('Error fetching tenant user:', tenantUserError)
      return NextResponse.json(
        { error: 'Failed to verify tenant access', details: tenantUserError.message },
        { status: 500 }
      )
    }

    if (!tenantUser || !tenantUser.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const { data: paymentProofs, error } = await supabase
      .from('tenant_payment_proofs')
      .select('*')
      .eq('tenant_id', tenantUser.tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch payment proofs' },
        { status: 500 }
      )
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

    return NextResponse.json({
      payment_proofs: paymentProofs || [],
      tenant: tenant,
      subscription: subscription || null
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

