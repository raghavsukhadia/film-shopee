/**
 * Database Query Optimization Utilities
 * 
 * Provides utilities to optimize Supabase queries:
 * - Select only needed columns
 * - Batch queries
 * - Prevent N+1 queries
 */

import { createClient } from '@/lib/supabase/client'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/helpers/tenant-context'
import { logger } from '@/lib/utils/logger'

/**
 * Optimized query builder that automatically:
 * - Adds tenant filter
 * - Selects only specified columns
 * - Handles super admin access
 */
export function createOptimizedQuery<T = any>(
  table: string,
  options: {
    select?: string
    filters?: Record<string, any>
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
    tenantId?: string | null
    isSuper?: boolean
  } = {}
) {
  const supabase = createClient()
  const tenantId = options.tenantId ?? getCurrentTenantId()
  const isSuper = options.isSuper ?? isSuperAdmin()

  let query = supabase.from(table)

  // Select only needed columns (performance optimization)
  if (options.select) {
    query = query.select(options.select)
  } else {
    // Default: select all, but this should be optimized in actual usage
    query = query.select('*')
  }

  // Add tenant filter (unless super admin)
  if (!isSuper && tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  // Add custom filters
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    }
  }

  // Add ordering
  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    })
  }

  // Add limit
  if (options.limit) {
    query = query.limit(options.limit)
  }

  return query
}

/**
 * Batch multiple queries to reduce round trips
 */
export async function batchQueries<T extends Record<string, any>>(
  queries: Array<() => Promise<{ data: T | null; error: any }>>
): Promise<Array<{ data: T | null; error: any }>> {
  try {
    return await Promise.all(queries.map(q => q()))
  } catch (error) {
    logger.error('Batch query failed', error)
    throw error
  }
}

/**
 * Optimize select statement to only fetch needed columns
 * 
 * Example:
 * optimizeSelect(['id', 'name', 'email'], { includeRelations: ['profile'] })
 * Returns: 'id, name, email, profile(id, name)'
 */
export function optimizeSelect(
  columns: string[],
  options: {
    includeRelations?: Record<string, string[]>
  } = {}
): string {
  let select = columns.join(', ')

  if (options.includeRelations) {
    const relations = Object.entries(options.includeRelations)
      .map(([relation, fields]) => `${relation}(${fields.join(', ')})`)
      .join(', ')
    
    if (relations) {
      select = `${select}, ${relations}`
    }
  }

  return select
}

/**
 * Common optimized select patterns
 */
export const optimizedSelects = {
  // Vehicle list - only fetch what's needed for list view
  vehicleList: 'id, registration_number, make, model, year, color, customer_name, customer_phone, status, created_at, updated_at',
  
  // Vehicle detail - fetch all for detail view
  vehicleDetail: '*',
  
  // Customer list
  customerList: 'id, name, phone, email, address, city, created_at',
  
  // Invoice list
  invoiceList: 'id, invoice_number, vehicle_id, total_amount, status, created_at, paid_date',
  
  // Settings - only fetch setting keys and values
  settings: 'id, setting_key, setting_value, setting_group, tenant_id',
}

