import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Helper to get tenant ID and role from user session
async function getTenantInfoFromSession(supabase: any): Promise<{ tenantId: string | null; role: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tenantId: null, role: null }

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    tenantId: tenantUser?.tenant_id || null,
    role: tenantUser?.role || null
  }
}

// Helper to check if user has access to an entry
async function checkEntryAccess(
  supabase: any,
  entryTenantId: string,
  userTenantId: string | null,
  userRole: string | null
): Promise<boolean> {
  // Check if user is super admin
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (superAdmin) {
      return true // Super admin can access any entry
    }
  }

  // Check if user is admin or accountant for the entry's tenant
  if (userTenantId && entryTenantId === userTenantId) {
    if (userRole === 'admin' || userRole === 'accountant') {
      return true
    }
  }

  return false
}

// POST - Close a billing entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const { id: entryId } = await params
    const { tenantId, role } = await getTenantInfoFromSession(supabase)

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    // Get user to check if super admin
    const { data: { user } } = await supabase.auth.getUser()
    let isSuperAdmin = false
    if (user) {
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      isSuperAdmin = !!superAdmin
    }

    // Verify entry exists
    let entryQuery = supabase
      .from('vehicle_inward')
      .select('id, tenant_id, billing_status, net_payable')
      .eq('id', entryId)

    // If not super admin and we have tenant ID, filter by tenant
    if (!isSuperAdmin && tenantId) {
      entryQuery = entryQuery.eq('tenant_id', tenantId)
    }

    const { data: entry, error: entryError } = await entryQuery.maybeSingle()

    if (entryError || !entry) {
      return NextResponse.json({ error: 'Billing entry not found' }, { status: 404 })
    }

    // Check if user has access (admin or accountant for the tenant)
    const hasAccess = await checkEntryAccess(supabase, entry.tenant_id, tenantId, role)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (entry.billing_status === 'closed') {
      return NextResponse.json({ error: 'Entry is already closed' }, { status: 400 })
    }

    // Calculate balance
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('vehicle_inward_id', entryId)

    const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
    const netPayable = parseFloat(entry.net_payable?.toString() || '0')
    const balanceDue = netPayable - totalPaid

    if (balanceDue > 0.01) { // Allow small rounding differences
      return NextResponse.json(
        { error: `Cannot close entry with outstanding balance (₹${balanceDue.toFixed(2)})` },
        { status: 400 }
      )
    }

    // Close entry
    const { error: updateError } = await supabase
      .from('vehicle_inward')
      .update({
        billing_status: 'closed',
        billing_closed_at: new Date().toISOString()
      })
      .eq('id', entryId)

    if (updateError) {
      console.error('Error closing entry:', updateError)
      return NextResponse.json({ error: 'Failed to close entry' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Entry closed successfully' })
  } catch (error: any) {
    console.error('Error in POST /api/billing/entries/[id]/close:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

