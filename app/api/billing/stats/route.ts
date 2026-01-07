import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// Route segment config
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper to get tenant ID from user session
async function getTenantIdFromSession(supabase: any): Promise<string | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      logger.error('[Billing Stats API] Error getting user from auth', userError, 'api/billing/stats')
      return null
    }
    
    if (!user) {
      logger.warn('[Billing Stats API] No user found in session', undefined, 'api/billing/stats')
      return null
    }

    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tenantUserError) {
      logger.error('[Billing Stats API] Error fetching tenant user', tenantUserError, 'api/billing/stats')
      return null
    }

    return tenantUser?.tenant_id || null
  } catch (error: any) {
    logger.error('[Billing Stats API] Unexpected error in getTenantIdFromSession', error, 'api/billing/stats')
    return null
  }
}

// GET - Fetch billing statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request.cookies)
    let tenantId = await getTenantIdFromSession(supabase)
    
    // Fallback: Try to get tenant ID from request headers (if frontend sends it)
    if (!tenantId) {
      const tenantIdHeader = request.headers.get('x-tenant-id')
      if (tenantIdHeader) {
        tenantId = tenantIdHeader
      }
    }
    
    logger.debug('[Billing Stats API] Tenant ID', { tenantId }, 'api/billing/stats')

    // Build query - fetch all fields needed to calculate net_payable
    // Note: total_amount doesn't exist as a column - it's calculated from accessories_requested JSON
    // Match frontend query: exclude completed/delivered statuses
    let query = supabase
      .from('vehicle_inward')
      .select('id, tenant_id, net_payable, accessories_requested, tax_amount, notes, billing_status, due_date, created_at, status')

    // Apply same filters as frontend
    query = query.not('status', 'in', '(completed,complete_and_delivered,delivered,delivered_final)')

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data: entries, error: entriesError } = await query

    if (entriesError) {
      logger.error('[Billing Stats API] Error fetching entries', entriesError, 'api/billing/stats')
      return NextResponse.json({ error: 'Failed to fetch entries', details: entriesError.message }, { status: 500 })
    }

    if (!entries || entries.length === 0) {
      logger.info('No entries found for stats calculation', undefined, 'api/billing/stats')
      return NextResponse.json({
        totalEntries: 0,
        totalRevenue: 0,
        totalReceivable: 0,
        outstandingAmount: 0,
        partialPaymentsCount: 0,
        overdueEntries: 0,
        averagePaymentTime: 0
      })
    }

    logger.info(`Found ${entries.length} entries for tenant ${tenantId}`, undefined, 'api/billing/stats')

    // Get all payments
    const entryIds = entries.map(e => e.id)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('vehicle_inward_id, amount, payment_date')
      .in('vehicle_inward_id', entryIds)
    
    if (paymentsError) {
      logger.error('Error fetching payments', paymentsError, 'api/billing/stats')
    }
    
    logger.debug(`Found ${payments?.length || 0} payments for ${entryIds.length} entries`, undefined, 'api/billing/stats')

    // Calculate statistics
    const totalEntries = entries.length
    let totalRevenue = 0
    let totalReceivable = 0
    let outstandingAmount = 0
    let partialPaymentsCount = 0
    let overdueEntries = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Group payments by entry
    const paymentsByEntry: { [key: string]: number } = {}
    payments?.forEach(p => {
      const entryId = p.vehicle_inward_id
      paymentsByEntry[entryId] = (paymentsByEntry[entryId] || 0) + parseFloat(p.amount.toString())
    })

    // Calculate payment times for closed entries
    const paymentTimes: number[] = []

    entries.forEach(entry => {
      // Calculate net_payable - use stored value or calculate from total_amount, discount, and tax
      let netPayable = 0
      
      if (entry.net_payable !== null && entry.net_payable !== undefined) {
        netPayable = parseFloat(entry.net_payable.toString())
      } else {
        // Calculate net_payable the same way as frontend: totalAmount - discountAmount + taxAmount
        // Calculate totalAmount from accessories_requested JSON (same as frontend)
        let totalAmount = 0
        if (entry.accessories_requested) {
          try {
            const parsed = JSON.parse(entry.accessories_requested)
            if (Array.isArray(parsed)) {
              totalAmount = parsed.reduce((sum: number, p: any) => {
                return sum + parseFloat(p.price || 0)
              }, 0)
            }
          } catch {
            // If parsing fails, totalAmount remains 0
          }
        }
        
        const taxAmount = parseFloat(entry.tax_amount?.toString() || '0')
        
        // Extract discount from notes if available
        let discountAmount = 0
        if (entry.notes) {
          try {
            const notesData = JSON.parse(entry.notes)
            if (notesData.discount) {
              discountAmount = parseFloat(notesData.discount.discount_amount || 0)
            }
          } catch {
            // If parsing fails, discount remains 0
          }
        }
        
        netPayable = totalAmount - discountAmount + taxAmount
      }
      
      // Skip entries with invalid or zero net_payable
      if (isNaN(netPayable) || netPayable <= 0) {
        logger.debug(`Skipping entry ${entry.id}: netPayable=${netPayable}`, undefined, 'api/billing/stats')
        return
      }
      
      const totalPaid = paymentsByEntry[entry.id] || 0
      const balanceDue = Math.max(0, netPayable - totalPaid) // Ensure balance due is never negative
      
      logger.debug(`Entry ${entry.id}: netPayable=${netPayable}, totalPaid=${totalPaid}, balanceDue=${balanceDue}`, undefined, 'api/billing/stats')

      // Total revenue is sum of all payments made
      totalRevenue += totalPaid
      
      // Total Receivable: Sum of all balance due amounts (all entries with pending payments)
      if (balanceDue > 0.01) {
        totalReceivable += balanceDue
      }
      
      // Outstanding Amount: Only overdue entries (due date crossed but payment not received)
      if (entry.due_date && balanceDue > 0.01) {
        const dueDate = new Date(entry.due_date)
        dueDate.setHours(0, 0, 0, 0)
        if (dueDate < today) {
          outstandingAmount += balanceDue
          overdueEntries++
        }
      }

      // Partial payments (count non-overdue partial payments)
      if (totalPaid > 0 && balanceDue > 0.01) {
        // Only count as partial payment if not overdue
        const dueDate = entry.due_date ? new Date(entry.due_date) : null
        if (dueDate) {
          dueDate.setHours(0, 0, 0, 0)
          if (dueDate >= today) {
            partialPaymentsCount++
          }
        } else {
          // No due date set, count as partial payment
          partialPaymentsCount++
        }
      }

      // Payment time for closed entries
      if (entry.billing_status === 'closed' && payments) {
        const entryPayments = payments.filter(p => p.vehicle_inward_id === entry.id)
        if (entryPayments.length > 0) {
          const firstPaymentDate = new Date(entryPayments[0].payment_date)
          const invoiceDate = entry.created_at ? new Date(entry.created_at) : null
          if (invoiceDate) {
            const daysDiff = Math.floor((firstPaymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff >= 0) {
              paymentTimes.push(daysDiff)
            }
          }
        }
      }
    })

    const averagePaymentTime = paymentTimes.length > 0
      ? paymentTimes.reduce((sum, days) => sum + days, 0) / paymentTimes.length
      : 0

    const result = {
      totalEntries,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalReceivable: Math.round(totalReceivable * 100) / 100,
      outstandingAmount: Math.round(outstandingAmount * 100) / 100,
      partialPaymentsCount,
      overdueEntries,
      averagePaymentTime: Math.round(averagePaymentTime * 10) / 10
    }

    logger.debug('Calculated stats', result, 'api/billing/stats')

    return NextResponse.json(result)
  } catch (error: any) {
    logger.error('[Billing Stats API] Error in GET /api/billing/stats', error, 'api/billing/stats')
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}

