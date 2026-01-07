import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET: Fetch all subscription plan requests for super admin
export async function GET(request: Request) {
  try {
    const adminSupabase = createAdminClient()

    const { data: requests, error } = await adminSupabase
      .from('subscription_plan_requests')
      .select(`
        *,
        tenants(id, name, tenant_code),
        auth.users!subscription_plan_requests_user_id_fkey(id, email, user_metadata)
      `)
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscription requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch requests', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH: Update subscription plan request status
export async function PATCH(request: Request) {
  try {
    const adminSupabase = createAdminClient()
    const body = await request.json()
    const { requestId, status, rejectionReason } = body

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const updateData: any = {
      status,
      reviewed_at: new Date().toISOString()
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }

    // Get current user (super admin) for reviewed_by
    // Note: This would need to be passed from the client or extracted from session
    // For now, we'll leave it null or handle it in the client

    const { data, error } = await adminSupabase
      .from('subscription_plan_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error updating subscription request:', error)
      return NextResponse.json(
        { error: 'Failed to update request', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, request: data })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}

