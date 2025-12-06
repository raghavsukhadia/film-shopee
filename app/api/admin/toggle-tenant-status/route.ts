import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

/**
 * PATCH /api/admin/toggle-tenant-status
 * Toggle tenant active/inactive status (for super admins only)
 */
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Verify user is super admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!superAdmin) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { tenantId, isActive } = body

    if (!tenantId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Tenant ID and isActive status are required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // If activating, check if subscription exists and create one if missing
    if (isActive) {
      const { data: existingSubscription } = await adminSupabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      // If no subscription exists, create one (365 days from today)
      if (!existingSubscription) {
        const startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 365)
        endDate.setHours(23, 59, 59, 999)

        const { error: subError } = await adminSupabase
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            plan_name: 'annual',
            amount: 12000.00,
            currency: 'INR',
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })

        if (subError) {
          console.error('Error creating subscription:', subError)
          // Continue with activation even if subscription creation fails
        }
      }
    }

    // Update tenant status
    const { error } = await adminSupabase
      .from('tenants')
      .update({ 
        is_active: isActive,
        subscription_status: isActive ? 'active' : 'inactive'
      })
      .eq('id', tenantId)

    if (error) {
      console.error('Error updating tenant status:', error)
      return NextResponse.json(
        { error: 'Failed to update tenant status: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Tenant ${isActive ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error: any) {
    console.error('Error in toggle-tenant-status API:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

