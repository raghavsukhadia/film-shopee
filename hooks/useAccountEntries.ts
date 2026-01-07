'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/helpers/tenant-context'
import { logger } from '@/lib/utils/logger'
import type { AccountEntry } from '@/types/billing'

export function useAccountEntries() {
  const [entries, setEntries] = useState<AccountEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAccountEntries = async (): Promise<AccountEntry[]> => {
    try {
      setLoading(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let query = supabase
        .from('vehicle_inward')
        .select('*')
        .not('status', 'in', '(completed,complete_and_delivered,delivered,delivered_final)')
        .order('created_at', { ascending: true })
      
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query

      if (error) {
        logger.error('Error fetching account entries', error, 'useAccountEntries')
        setEntries([])
        setLoading(false)
        return []
      }

      if (data && data.length > 0) {
        // Fetch payments for all entries
        const entryIds = data.map(v => v.id)
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('vehicle_inward_id, amount')
          .in('vehicle_inward_id', entryIds)
        
        if (paymentsError) {
          logger.error('Error fetching payments for entries', paymentsError, 'useAccountEntries')
        }

        // Map to AccountEntry format
        const mappedEntries: AccountEntry[] = data.map((v: any, index: number) => {
          const sequentialId = `Z${String(index + 1).padStart(2, '0')}`
          const entryPayments = payments?.filter(p => p.vehicle_inward_id === v.id) || []
          const totalPaid = entryPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
          
          // Calculate netPayable
          let netPayable = 0
          if (v.net_payable !== null && v.net_payable !== undefined) {
            netPayable = parseFloat(v.net_payable.toString())
          } else {
            // Calculate from accessories_requested
            let totalAmount = 0
            if (v.accessories_requested) {
              try {
                const parsed = JSON.parse(v.accessories_requested)
                if (Array.isArray(parsed)) {
                  totalAmount = parsed.reduce((sum: number, p: any) => sum + parseFloat(p.price || 0), 0)
                }
              } catch {
                // If parsing fails, totalAmount remains 0
              }
            }
            
            const taxAmount = parseFloat(v.tax_amount?.toString() || '0')
            let discountAmount = 0
            if (v.notes) {
              try {
                const notesData = JSON.parse(v.notes)
                if (notesData.discount?.discount_amount) {
                  discountAmount = parseFloat(notesData.discount.discount_amount) || 0
                }
              } catch {
                // If parsing fails, discount remains 0
              }
            }
            
            netPayable = totalAmount - discountAmount + taxAmount
          }
          
          const balanceDue = Math.max(0, netPayable - totalPaid)

          return {
            id: v.id,
            shortId: sequentialId,
            customerName: v.customer_name || 'N/A',
            customerPhone: v.customer_phone || 'N/A',
            customerEmail: v.customer_email,
            vehicleNumber: v.registration_number || 'N/A',
            model: v.model || 'N/A',
            make: v.make || 'N/A',
            year: v.year,
            color: v.color,
            vehicleType: v.vehicle_type,
            location: v.location_id,
            manager: v.assigned_manager_id,
            installationCompleteDate: v.created_at,
            expectedDelivery: v.estimated_completion_date,
            products: v.accessories_requested ? (() => {
              try {
                const parsed = JSON.parse(v.accessories_requested)
                return Array.isArray(parsed) ? parsed.map((p: any) => ({
                  product: p.product || '',
                  brand: p.brand || '',
                  price: parseFloat(p.price || 0),
                  department: p.department || ''
                })) : []
              } catch {
                return []
              }
            })() : [],
            totalAmount: netPayable,
            status: v.status || 'pending',
            created_at: v.created_at,
            completed_at: v.completed_at,
            discountAmount: (() => {
              if (v.notes) {
                try {
                  const notesData = JSON.parse(v.notes)
                  return parseFloat(notesData.discount?.discount_amount || 0)
                } catch {
                  return 0
                }
              }
              return 0
            })(),
            discountPercentage: (() => {
              if (v.notes) {
                try {
                  const notesData = JSON.parse(v.notes)
                  return parseFloat(notesData.discount?.discount_percentage || 0)
                } catch {
                  return 0
                }
              }
              return 0
            })(),
            discountOfferedBy: (() => {
              if (v.notes) {
                try {
                  const notesData = JSON.parse(v.notes)
                  return notesData.discount?.discount_offered_by || ''
                } catch {
                  return ''
                }
              }
              return ''
            })(),
            finalAmount: netPayable,
            invoiceNumber: v.invoice_number,
            billingStatus: v.billing_status,
            invoiceDate: v.invoice_date,
            invoiceAmount: v.invoice_amount,
            taxAmount: parseFloat(v.tax_amount?.toString() || '0'),
            netPayable,
            dueDate: v.due_date,
            billingClosedAt: v.billing_closed_at,
            payments: entryPayments.map(p => ({
              id: p.id || '',
              amount: parseFloat(p.amount.toString()),
              payment_method: p.payment_method || '',
              payment_date: p.payment_date || '',
              vehicle_inward_id: p.vehicle_inward_id,
              notes: p.notes,
              created_at: p.created_at,
              created_by: p.created_by
            })),
            totalPaid,
            balanceDue
          }
        })

        setEntries(mappedEntries)
        setLoading(false)
        return mappedEntries
      } else {
        setEntries([])
        setLoading(false)
        return []
      }
    } catch (error) {
      logger.error('Error fetching account entries', error, 'useAccountEntries')
      setEntries([])
      setLoading(false)
      return []
    }
  }

  useEffect(() => {
    fetchAccountEntries()
  }, [])

  return {
    entries,
    loading,
    refetch: fetchAccountEntries
  }
}

