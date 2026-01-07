import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Helper to get tenant ID and role from user session
async function getTenantInfoFromSession(supabase: any): Promise<{ tenantId: string | null; role: string | null }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Error getting user from auth:', userError)
      return { tenantId: null, role: null }
    }
    
    if (!user) {
      console.warn('No user found in session')
      return { tenantId: null, role: null }
    }

    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tenantUserError) {
      console.error('Error fetching tenant user:', {
        error: tenantUserError,
        userId: user.id,
        code: tenantUserError.code,
        message: tenantUserError.message
      })
      return { tenantId: null, role: null }
    }

    console.log('Tenant info retrieved:', {
      userId: user.id,
      tenantId: tenantUser?.tenant_id || null,
      role: tenantUser?.role || null
    })

    return {
      tenantId: tenantUser?.tenant_id || null,
      role: tenantUser?.role || null
    }
  } catch (error: any) {
    console.error('Unexpected error in getTenantInfoFromSession:', error)
    return { tenantId: null, role: null }
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

// GET - Fetch all payments for a billing entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const { id: entryId } = await params

    console.log('GET /api/billing/entries/[id]/payments - Entry ID:', entryId)

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    // Get tenant info and user role from session
    const { tenantId, role } = await getTenantInfoFromSession(supabase)

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
    // Try to query the entry - RLS will handle permissions
    let entryQuery = supabase
      .from('vehicle_inward')
      .select('id, tenant_id')
      .eq('id', entryId)

    // If we have tenant ID, add it to help RLS (but don't require it)
    if (tenantId) {
      entryQuery = entryQuery.eq('tenant_id', tenantId)
    }

    const { data: entry, error: entryError } = await entryQuery.maybeSingle()

    console.log('Entry query result:', { 
      entry: entry ? { id: entry.id, tenant_id: entry.tenant_id } : null, 
      entryError: entryError ? {
        code: entryError.code,
        message: entryError.message,
        details: entryError.details,
        hint: entryError.hint
      } : null,
      tenantId, 
      role,
      isSuperAdmin,
      entryId
    })

    // If entry not found, return empty payments array
    if (entryError || !entry) {
      // Check if it's an RLS error
      if (entryError?.code === 'PGRST301' || entryError?.message?.includes('permission') || entryError?.message?.includes('policy')) {
        console.warn('RLS blocked entry access:', {
          entryId,
          error: entryError?.message,
          tenantId,
          role,
          isSuperAdmin
        })
      } else {
        console.warn('Entry not found:', {
          entryId,
          error: entryError?.message || 'Entry not found',
          tenantId,
          role,
          isSuperAdmin
        })
      }
      return NextResponse.json({ payments: [] })
    }

    // Check if user has access to this entry (admin or accountant for the tenant)
    const hasAccess = await checkEntryAccess(supabase, entry.tenant_id, tenantId, role)
    if (!hasAccess) {
      console.warn('Access denied to entry:', {
        entryId,
        entryTenantId: entry.tenant_id,
        userTenantId: tenantId,
        userRole: role,
        isSuperAdmin
      })
      return NextResponse.json({ payments: [] })
    }

    // Fetch payments - RLS will ensure user can only see payments for entries they can access
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('vehicle_inward_id', entryId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      // Return empty array on error instead of failing
      return NextResponse.json({ payments: [] })
    }

    return NextResponse.json({ payments: payments || [] })
  } catch (error: any) {
    console.error('Error in GET /api/billing/entries/[id]/payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new payment
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

    const { amount, payment_method, payment_date, reference_number, notes } = body

    // Validation
    if (!amount || !payment_method || !payment_date) {
      return NextResponse.json(
        { error: 'Amount, payment method, and payment date are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    // Get user and check if super admin
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

    // Verify entry exists and is not closed
    let entryQuery = supabase
      .from('vehicle_inward')
      .select('id, tenant_id, billing_status, net_payable, accessories_requested, notes, tax_amount')
      .eq('id', entryId)

    // If we have tenant ID, add it to help RLS (but don't require it)
    if (tenantId) {
      entryQuery = entryQuery.eq('tenant_id', tenantId)
    }

    const { data: entry, error: entryError } = await entryQuery.maybeSingle()

    console.log('POST Entry query result:', { 
      entry: entry ? { id: entry.id, tenant_id: entry.tenant_id, billing_status: entry.billing_status } : null, 
      entryError: entryError ? {
        code: entryError.code,
        message: entryError.message,
        details: entryError.details,
        hint: entryError.hint
      } : null,
      tenantId, 
      role,
      isSuperAdmin,
      entryId
    })

    if (entryError || !entry) {
      // Check if it's an RLS error
      if (entryError?.code === 'PGRST301' || entryError?.message?.includes('permission') || entryError?.message?.includes('policy')) {
        console.error('RLS blocked entry access:', {
          entryId,
          error: entryError?.message,
          tenantId,
          role,
          isSuperAdmin
        })
      } else {
        console.error('Entry not found:', {
          entryId,
          error: entryError?.message || 'Entry not found',
          tenantId,
          role,
          isSuperAdmin
        })
      }
      return NextResponse.json({ error: 'Billing entry not found or access denied' }, { status: 404 })
    }

    // Check if user has access to this entry
    const hasAccess = await checkEntryAccess(supabase, entry.tenant_id, tenantId, role)
    if (!hasAccess) {
      console.warn('Access denied to entry:', {
        entryId,
        entryTenantId: entry.tenant_id,
        userTenantId: tenantId,
        userRole: role,
        isSuperAdmin
      })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (entry.billing_status === 'closed') {
      return NextResponse.json({ error: 'Cannot add payment to closed entry' }, { status: 400 })
    }

    // Calculate current balance
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('vehicle_inward_id', entryId)

    const totalPaid = existingPayments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
    
    // Calculate net_payable if not set in database
    let netPayable = parseFloat(entry.net_payable?.toString() || '0')
    
    if (netPayable === 0 || !entry.net_payable) {
      // Calculate from accessories_requested
      let totalAmount = 0
      if (entry.accessories_requested) {
        try {
          const parsed = JSON.parse(entry.accessories_requested)
          if (Array.isArray(parsed)) {
            totalAmount = parsed.reduce((sum: number, p: any) => sum + parseFloat(p.price || 0), 0)
          }
        } catch (e) {
          console.warn('Error parsing accessories_requested:', e)
        }
      }
      
      // Get discount from notes
      let discountAmount = 0
      if (entry.notes) {
        try {
          const notesData = JSON.parse(entry.notes)
          if (notesData.discount?.discount_amount) {
            discountAmount = parseFloat(notesData.discount.discount_amount)
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Get tax amount
      const taxAmount = parseFloat(entry.tax_amount?.toString() || '0')
      
      // Calculate net payable: totalAmount - discountAmount + taxAmount
      netPayable = totalAmount - discountAmount + taxAmount
    }
    
    const balanceDue = netPayable - totalPaid

    if (amount > balanceDue) {
      return NextResponse.json(
        { error: `Payment amount exceeds balance due (₹${balanceDue.toFixed(2)})` },
        { status: 400 }
      )
    }

    // Create payment (user is already available from authorization check above)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: entry.tenant_id,
        vehicle_inward_id: entryId,
        amount: parseFloat(amount),
        payment_method,
        payment_date,
        reference_number: reference_number || null,
        notes: notes || null,
        created_by: user?.id || null
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    // Check if balance is now zero and auto-close if invoiced
    const newTotalPaid = totalPaid + parseFloat(amount)
    if (newTotalPaid >= netPayable && entry.billing_status === 'invoiced') {
      await supabase
        .from('vehicle_inward')
        .update({ billing_status: 'closed', billing_closed_at: new Date().toISOString() })
        .eq('id', entryId)
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/billing/entries/[id]/payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const { id: entryId } = await params
    const { tenantId, role } = await getTenantInfoFromSession(supabase)
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    // Verify payment exists and belongs to entry
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, vehicle_inward!inner(tenant_id, billing_status)')
      .eq('id', paymentId)
      .eq('vehicle_inward_id', entryId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const entry = payment.vehicle_inward as any
    
    // Check authorization
    const hasAccess = await checkEntryAccess(supabase, entry.tenant_id, tenantId, role)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (entry.billing_status === 'closed') {
      return NextResponse.json({ error: 'Cannot delete payment from closed entry' }, { status: 400 })
    }

    // Delete payment
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)

    if (deleteError) {
      console.error('Error deleting payment:', deleteError)
      return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/billing/entries/[id]/payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

