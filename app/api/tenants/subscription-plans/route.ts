import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET: Fetch available subscription plans for tenant admins
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        plans: [] 
      }, { status: 401 })
    }

    // Get tenant_id for the user
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (tenantUserError) {
      console.error('Error fetching tenant user:', tenantUserError)
      return NextResponse.json({ 
        error: 'Failed to verify tenant admin status', 
        details: tenantUserError.message,
        plans: [] 
      }, { status: 500 })
    }

    if (!tenantUser || !tenantUser.tenant_id) {
      return NextResponse.json({ 
        error: 'User is not a tenant admin', 
        plans: [] 
      }, { status: 403 })
    }

    // Fetch platform subscription plans (tenant_id IS NULL)
    const { data: platformSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'subscription_plans')
      .is('tenant_id', null)
      .maybeSingle()

    // Log for debugging
    if (settingsError) {
      console.error('Error fetching subscription plans from database:', settingsError)
    }

    let plans: any[] = []
    if (platformSettings?.setting_value) {
      try {
        const parsedPlans = JSON.parse(platformSettings.setting_value)
        // Ensure it's an array
        if (Array.isArray(parsedPlans)) {
          plans = parsedPlans
          console.log(`Loaded ${plans.length} subscription plans from database`)
        } else {
          console.warn('Subscription plans data is not an array:', typeof parsedPlans)
        }
      } catch (e) {
        console.error('Error parsing subscription plans:', e)
        // Return empty array if parsing fails
        return NextResponse.json({ plans: [], error: 'Failed to parse subscription plans' })
      }
    } else {
      console.log('No subscription plans found in database. Super admin needs to create plans in Platform Settings.')
    }

    // Filter only active plans
    const activePlans = plans.filter((plan: any) => {
      if (!plan) return false
      // Check if plan is active (default to true if not specified)
      return plan.is_active !== false
    })

    console.log(`Returning ${activePlans.length} active subscription plans`)

    return NextResponse.json({ plans: activePlans || [] })
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error)
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred', 
        details: error.message,
        plans: [] 
      },
      { status: 500 }
    )
  }
}

// POST: Submit a subscription plan request
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan_name, plan_display_name, amount, currency, billing_cycle } = body

    if (!plan_name || !plan_display_name || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get tenant_id for the user
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!tenantUser || !tenantUser.tenant_id) {
      return NextResponse.json({ error: 'User is not a tenant admin' }, { status: 403 })
    }

    // Check if there's already a pending request for this tenant
    const { data: existingRequest } = await supabase
      .from('subscription_plan_requests')
      .select('id')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending subscription request. Please wait for approval.' },
        { status: 400 }
      )
    }

    // Create subscription plan request
    const { data: requestData, error: requestError } = await supabase
      .from('subscription_plan_requests')
      .insert({
        tenant_id: tenantUser.tenant_id,
        user_id: user.id,
        plan_name,
        plan_display_name,
        amount: parseFloat(amount),
        currency: currency || 'INR',
        billing_cycle: billing_cycle || 'annual',
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating subscription request:', requestError)
      return NextResponse.json(
        { error: 'Failed to submit request', details: requestError.message },
        { status: 500 }
      )
    }

    // Send notification to all super admins
    try {
      const { data: superAdmins } = await supabase
        .from('super_admins')
        .select('user_id')

      if (superAdmins && superAdmins.length > 0) {
        const notifications = superAdmins.map(sa => ({
          user_id: sa.user_id,
          tenant_id: tenantUser.tenant_id,
          title: 'New Subscription Plan Request',
          message: `Tenant has requested subscription plan: ${plan_display_name} (${plan_name})`,
          type: 'info',
          read: false,
          priority: 2,
          action_url: `/admin/subscriptions`
        }))

        for (const notification of notifications) {
          await supabase.from('notifications').insert(notification)
        }
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription plan request submitted successfully',
      request: requestData
    }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error in subscription plan request:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}

