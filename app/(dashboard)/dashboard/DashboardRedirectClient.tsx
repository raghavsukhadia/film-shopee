'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardPageClient from './DashboardPageClient'
import { getCurrentTenantId } from '@/lib/helpers/tenant-context'
import { createClient } from '@/lib/supabase/client'

export default function DashboardRedirectClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantParam = searchParams.get('tenant')
  const [redirecting, setRedirecting] = useState(false)
  
  useEffect(() => {
    if (redirecting) return
    
    // If tenant is in query params, redirect to path-based route
    if (tenantParam) {
      // Check if it's a tenant code (FS01, FS02, etc.) or UUID
      const isTenantCode = /^FS\d+$/i.test(tenantParam)
      
      if (isTenantCode) {
        setRedirecting(true)
        router.replace(`/dashboard/${tenantParam.toUpperCase()}`)
        return
      }
      
      // For UUIDs, try to fetch tenant code and redirect
      const fetchAndRedirect = async () => {
        try {
          const supabase = createClient()
          const { data: tenant } = await supabase
            .from('tenants')
            .select('tenant_code')
            .eq('id', tenantParam)
            .single()
          
          if (tenant?.tenant_code) {
            setRedirecting(true)
            router.replace(`/dashboard/${tenant.tenant_code}`)
          }
        } catch (error) {
          console.error('Error fetching tenant code:', error)
          // Fall through to show DashboardPageClient with query param
        }
      }
      
      fetchAndRedirect()
      return
    }
    
    // If no tenant in URL, try to get from sessionStorage and redirect
    const currentTenantId = getCurrentTenantId()
    if (currentTenantId) {
      const fetchAndRedirectFromStorage = async () => {
        try {
          const supabase = createClient()
          const { data: tenant } = await supabase
            .from('tenants')
            .select('tenant_code')
            .eq('id', currentTenantId)
            .single()
          
          if (tenant?.tenant_code) {
            setRedirecting(true)
            router.replace(`/dashboard/${tenant.tenant_code}`)
          }
        } catch (error) {
          console.error('Error fetching tenant code from storage:', error)
          // Fall through to show DashboardPageClient
        }
      }
      
      fetchAndRedirectFromStorage()
    }
  }, [tenantParam, router, redirecting])
  
  // If redirecting, show loading state
  if (redirecting) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    )
  }
  
  // If no tenant param or redirect failed, show the client component which will handle initialization
  return <DashboardPageClient />
}

