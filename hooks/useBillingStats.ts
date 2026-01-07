'use client'

import { useState, useEffect } from 'react'
import { getCurrentTenantId } from '@/lib/helpers/tenant-context'
import { logger } from '@/lib/utils/logger'
import type { BillingStats } from '@/types/billing'

export function useBillingStats() {
  const [stats, setStats] = useState<BillingStats>({
    totalEntries: 0,
    totalRevenue: 0,
    totalReceivable: 0,
    outstandingAmount: 0,
    partialPaymentsCount: 0,
    overdueEntries: 0,
    averagePaymentTime: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchBillingStats = async () => {
    try {
      setLoading(true)
      const tenantId = getCurrentTenantId()
      
      const response = await fetch(`/api/billing/stats?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        },
        cache: 'no-store'
      })
      
      const contentType = response.headers.get('content-type')
      let data = {}
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (jsonError) {
          logger.error('Failed to parse JSON response', jsonError, 'useBillingStats')
          const text = await response.text()
          data = { error: 'Invalid JSON response', text }
        }
      } else {
        const text = await response.text()
        logger.error('Non-JSON response', { contentType, text }, 'useBillingStats')
        data = { error: 'Non-JSON response', text }
      }
      
      if (response.ok && !data.error) {
        setStats(data as BillingStats)
      } else {
        logger.error('Error in billing stats response', {
          status: response.status,
          error: data.error
        }, 'useBillingStats')
        setStats({
          totalEntries: 0,
          totalRevenue: 0,
          totalReceivable: 0,
          outstandingAmount: 0,
          partialPaymentsCount: 0,
          overdueEntries: 0,
          averagePaymentTime: 0
        })
      }
    } catch (error: any) {
      logger.error('Error fetching billing stats', error, 'useBillingStats')
      setStats({
        totalEntries: 0,
        totalRevenue: 0,
        totalReceivable: 0,
        outstandingAmount: 0,
        partialPaymentsCount: 0,
        overdueEntries: 0,
        averagePaymentTime: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBillingStats()
  }, [])

  return {
    stats,
    loading,
    refetch: fetchBillingStats
  }
}

