import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Get primary admin for the tenant, fallback to any admin if primary not found
    let { data: tenantUser, error: tenantUserError } = await adminSupabase
      .from('tenant_users')
      .select('user_id, role, is_primary_admin')
      .eq('tenant_id', tenantId)
      .eq('is_primary_admin', true)
      .eq('role', 'admin')
      .maybeSingle()

    // If no primary admin found, get any admin
    if (tenantUserError || !tenantUser) {
      const { data: anyAdmin, error: anyAdminError } = await adminSupabase
        .from('tenant_users')
        .select('user_id, role')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle()
      
      if (anyAdminError || !anyAdmin) {
        return NextResponse.json(
          { error: 'Admin not found for this tenant' },
          { status: 404 }
        )
      }
      
      tenantUser = anyAdmin
    }

    // Get user details from auth.users
    const { data: users, error: usersError } = await adminSupabase.auth.admin.listUsers()
    
    if (usersError) {
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 500 }
      )
    }

    const adminUser = users.users.find(u => u.id === tenantUser.user_id)

    if (!adminUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get approval request if exists
    const { data: approvalRequest } = await adminSupabase
      .from('tenant_approval_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get payment proofs
    const { data: paymentProofs } = await adminSupabase
      .from('tenant_payment_proofs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.user_metadata?.name || adminUser.email?.split('@')[0] || 'N/A',
        phone: adminUser.user_metadata?.phone || 'N/A',
        created_at: adminUser.created_at,
        password_set: !!adminUser.encrypted_password // Password is set if encrypted_password exists
      },
      tenant: {
        ...tenant,
        approval_request: approvalRequest,
        payment_proofs: paymentProofs || []
      }
    })

  } catch (error: any) {
    console.error('Error fetching tenant details:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}

