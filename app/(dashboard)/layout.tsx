'use client'

import { useState, useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'
import SubscriptionGuard from '@/components/SubscriptionGuard'
import { createClient } from '@/lib/supabase/client'
import { checkUserRole, type UserRole } from '@/lib/rbac'
import { getWorkspaceUrl, initializeTenantFromWorkspace } from '@/lib/workspace-detector'
import { getCurrentTenantId } from '@/lib/tenant-context'

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [userRole, setUserRole] = useState<UserRole>('admin')
  const [userName, setUserName] = useState('Demo Admin')
  const [userEmail, setUserEmail] = useState('raghav@sunkool.in')
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  // Check if this is an admin route - if so, skip tenant layout
  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Skip loading user data for admin routes - admin layout handles it
    if (isAdminRoute) {
      setLoading(false)
      return
    }

    // Initialize tenant context from workspace URL (subdomain or query param)
    const initializeTenant = async () => {
      const workspaceUrl = getWorkspaceUrl()
      if (workspaceUrl) {
        await initializeTenantFromWorkspace(workspaceUrl)
      }
    }
    
    initializeTenant().then(() => {
      loadUserData()
    })
    
    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel('profile-updates-layout')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadUserData()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        () => {
          loadUserData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdminRoute, searchParams])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Get user from auth
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user is super admin
        const { data: superAdmin } = await supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        
        const isSuperAdmin = !!superAdmin
        
        // Get tenant_id from session or database
        let tenantId = getCurrentTenantId()
        if (!tenantId) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (tenantUser) {
            tenantId = tenantUser.tenant_id
            sessionStorage.setItem('current_tenant_id', tenantId)
          }
        }
        
        // Get role from tenant_users table (this is the source of truth for tenant users)
        let isTenantAdmin = false
        let effectiveRole: UserRole = 'coordinator' // default
        if (tenantId) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('role')
            .eq('tenant_id', tenantId)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (tenantUser && tenantUser.role) {
            effectiveRole = tenantUser.role as UserRole
            if (tenantUser.role === 'admin') {
              isTenantAdmin = true
            }
          }
        }
        
        // Also check if user is admin in tenant Z01 (first tenant = super admin tenant)
        const Z01_TENANT_ID = '00000000-0000-0000-0000-000000000001'
        if (!isTenantAdmin) {
          const { data: z01Admin } = await supabase
            .from('tenant_users')
            .select('role')
            .eq('tenant_id', Z01_TENANT_ID)
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle()
          
          if (z01Admin) {
            isTenantAdmin = true
          }
        }
        
        // Super admin OR tenant admin (including Z01 admin) should have 'admin' role
        if (isSuperAdmin || isTenantAdmin) {
          effectiveRole = 'admin'
        }
        
        // Get profile data for name and email
        const profile = await checkUserRole()
        
        if (profile) {
          // Use effective role (which includes super admin/Z01 admin check)
          setUserRole(effectiveRole)
          setUserName(profile.name || user.user_metadata?.name || user.email || 'User')
          setUserEmail(user.email || '')
        } else {
          // Fallback to auth user metadata
          setUserRole(effectiveRole)
          setUserName(user.user_metadata?.name || user.email || 'User')
          setUserEmail(user.email || '')
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  // For admin routes, just render children - admin layout handles everything
  if (isAdminRoute) {
    return <>{children}</>
  }

  // For regular tenant routes, render with sidebar and topbar wrapped in SubscriptionGuard
  return (
    <SubscriptionGuard>
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        backgroundColor: '#f8fafc',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <Sidebar userRole={userRole} />
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          width: isMobile ? '100%' : 'auto'
        }}>
          {!loading && (
            <Topbar 
              userRole={userRole}
              userName={userName}
              userEmail={userEmail}
            />
          )}
          <main style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: isMobile ? '1rem' : '1.5rem' 
          }}>
            {children}
          </main>
        </div>
      </div>
    </SubscriptionGuard>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}
