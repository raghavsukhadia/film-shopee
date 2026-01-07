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

// POST - Update invoice reconciliation data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const { id: entryId } = await params
    const { tenantId, role } = await getTenantInfoFromSession(supabase)
    const body = await request.json()

    const { invoice_number, invoice_date, invoice_amount, reconciliation_notes } = body

    if (!invoice_number) {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 })
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
      .select('id, tenant_id, net_payable')
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

    // Prepare update data
    const updateData: any = {
      invoice_number,
      billing_status: 'invoiced'
    }

    if (invoice_date) {
      updateData.invoice_date = invoice_date
    }

    if (invoice_amount !== undefined && invoice_amount !== null) {
      updateData.invoice_amount = parseFloat(invoice_amount)
    }

    // Store reconciliation notes in notes field (JSON)
    if (reconciliation_notes) {
      const { data: existing } = await supabase
        .from('vehicle_inward')
        .select('notes')
        .eq('id', entryId)
        .single()

      let notesData: any = {}
      if (existing?.notes) {
        try {
          notesData = JSON.parse(existing.notes)
        } catch {
          notesData = {}
        }
      }

      notesData.reconciliation_notes = reconciliation_notes
      updateData.notes = JSON.stringify(notesData)
    }

    // Update entry
    const { error: updateError } = await supabase
      .from('vehicle_inward')
      .update(updateData)
      .eq('id', entryId)

    if (updateError) {
      console.error('Error updating reconciliation:', updateError)
      return NextResponse.json({ error: 'Failed to update reconciliation' }, { status: 500 })
    }

    // Calculate mismatch if invoice_amount is provided
    let mismatch = null
    if (invoice_amount !== undefined && invoice_amount !== null) {
      const netPayable = parseFloat(entry.net_payable?.toString() || '0')
      const invoiceAmt = parseFloat(invoice_amount)
      if (Math.abs(netPayable - invoiceAmt) > 0.01) {
        mismatch = {
          oms_amount: netPayable,
          invoice_amount: invoiceAmt,
          difference: invoiceAmt - netPayable
        }
      }
    }

    return NextResponse.json({
      success: true,
      mismatch
    })
  } catch (error: any) {
    console.error('Error in POST /api/billing/entries/[id]/reconcile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

