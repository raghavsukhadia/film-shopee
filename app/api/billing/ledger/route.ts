import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// Helper to get tenant ID from user session
async function getTenantIdFromSession(supabase: any): Promise<string | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      logger.error('Error getting user from auth', userError, 'api/billing/ledger')
      return null
    }
    
    if (!user) {
      logger.warn('No user found in session', undefined, 'api/billing/ledger')
      return null
    }

    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tenantUserError) {
      logger.error('Error fetching tenant user', {
        error: tenantUserError,
        userId: user.id,
        code: tenantUserError.code,
        message: tenantUserError.message
      }, 'api/billing/ledger')
      return null
    }

    return tenantUser?.tenant_id || null
  } catch (error: any) {
    logger.error('Unexpected error in getTenantIdFromSession', error, 'api/billing/ledger')
    return null
  }
}

// GET - Fetch ledger data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantIdFromSession(supabase)
    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get('groupBy') || 'vehicle' // 'vehicle' or 'customer'

    // Fetch entries
    let entriesQuery = supabase
      .from('vehicle_inward')
      .select('id, customer_name, registration_number, make, model, net_payable, created_at, billing_status')

    if (tenantId) {
      entriesQuery = entriesQuery.eq('tenant_id', tenantId)
    }

    const { data: entries, error: entriesError } = await entriesQuery

    if (entriesError) {
      logger.error('Error fetching entries', entriesError, 'api/billing/ledger')
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ ledger: [] })
    }

    // Fetch payments
    const entryIds = entries.map(e => e.id)
    const { data: payments } = await supabase
      .from('payments')
      .select('vehicle_inward_id, amount, payment_date, payment_method, reference_number')
      .in('vehicle_inward_id', entryIds)
      .order('payment_date', { ascending: true })

    // Build ledger entries
    const ledger: any[] = []

    entries.forEach(entry => {
      const entryPayments = payments?.filter(p => p.vehicle_inward_id === entry.id) || []
      const netPayable = parseFloat(entry.net_payable?.toString() || '0')

      // Add debit entry (bill)
      const description = groupBy === 'vehicle'
        ? `${entry.make} ${entry.model} (${entry.registration_number})`
        : `${entry.customer_name} - ${entry.registration_number}`

      ledger.push({
        date: entry.created_at,
        description: `Bill: ${description}`,
        debit: netPayable,
        credit: 0,
        entry_id: entry.id,
        type: 'bill'
      })

      // Add credit entries (payments)
      entryPayments.forEach(payment => {
        ledger.push({
          date: payment.payment_date,
          description: `Payment: ${payment.payment_method}${payment.reference_number ? ` (${payment.reference_number})` : ''}`,
          debit: 0,
          credit: parseFloat(payment.amount.toString()),
          entry_id: entry.id,
          type: 'payment'
        })
      })
    })

    // Sort by date
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate running balance
    let runningBalance = 0
    const ledgerWithBalance = ledger.map(entry => {
      runningBalance = runningBalance + entry.debit - entry.credit
      return {
        ...entry,
        balance: Math.round(runningBalance * 100) / 100
      }
    })

    return NextResponse.json({ ledger: ledgerWithBalance })
  } catch (error: any) {
    logger.error('Error in GET /api/billing/ledger', error, 'api/billing/ledger')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

