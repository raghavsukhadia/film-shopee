import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

// Helper function to verify super admin or RS Car admin
async function verifySuperAdmin() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized', status: 401, user: null }
  }

  const RS_CAR_ACCESSORIES_TENANT_ID = '00000000-0000-0000-0000-000000000001'

  // Check if user is in super_admins table
  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Check if user is admin in RS Car Accessories tenant
  const { data: rsCarAdmin } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', RS_CAR_ACCESSORIES_TENANT_ID)
    .eq('role', 'admin')
    .maybeSingle()

  if (!superAdmin && !rsCarAdmin) {
    return { error: 'Forbidden: Super admin access required', status: 403, user: null }
  }

  return { error: null, status: 200, user }
}

// GET: Get database statistics for a tenant
export async function GET(request: NextRequest) {
  try {
    // Verify super admin
    const authResult = await verifySuperAdmin()
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .select('id, name, tenant_code')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Fetch counts for all tables using admin client (bypasses RLS)
    console.log(`Fetching database stats for tenant: ${tenant.name} (${tenant.tenant_code})`)
    console.log(`Tenant ID: ${tenant_id}`)
    
    // Test query first to see if we can access data
    const testQuery = await adminSupabase
      .from('vehicles')
      .select('id, tenant_id')
      .eq('tenant_id', tenant_id)
      .limit(5)
    
    console.log('Test query result:', {
      data: testQuery.data?.length || 0,
      error: testQuery.error,
      count: testQuery.count
    })
    
    const [vehicles, customers, invoices, workOrders, payments, expenses] = await Promise.all([
      adminSupabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
      adminSupabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
      adminSupabase.from('invoices').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
      adminSupabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
      adminSupabase.from('payments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id),
      adminSupabase.from('expenses').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id)
    ])

    // Log detailed results
    console.log('Query results:', {
      vehicles: { count: vehicles.count, error: vehicles.error },
      customers: { count: customers.count, error: customers.error },
      invoices: { count: invoices.count, error: invoices.error },
      workOrders: { count: workOrders.count, error: workOrders.error },
      payments: { count: payments.count, error: payments.error },
      expenses: { count: expenses.count, error: expenses.error }
    })

    const stats = {
      vehicles: vehicles.count || 0,
      customers: customers.count || 0,
      invoices: invoices.count || 0,
      workOrders: workOrders.count || 0,
      payments: payments.count || 0,
      expenses: expenses.count || 0
    }

    console.log('Final database stats:', stats)

    return NextResponse.json(stats)

  } catch (error: any) {
    console.error('Error fetching database stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database statistics: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

