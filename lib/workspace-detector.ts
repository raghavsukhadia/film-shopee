/**
 * Utility functions to detect workspace URL from subdomain
 * and handle tenant context setup
 */

/**
 * Extract workspace URL from current hostname
 * Examples:
 * - rs-car-accessories-nagpur.zoravo-oms.vercel.app → rs-car-accessories-nagpur
 * - zoravo-oms.vercel.app → null (main domain)
 * - localhost:3000 → null (development)
 */
export function getWorkspaceFromHostname(): string | null {
  if (typeof window === 'undefined') return null
  
  const hostname = window.location.hostname
  const parts = hostname.split('.')
  
  // Skip if localhost or IP address
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.startsWith('192.168.')) {
    return null
  }
  
  // For Vercel: workspace.project.vercel.app (4 parts)
  // For custom domain: workspace.domain.com (3 parts)
  if (parts.length >= 3) {
    const firstPart = parts[0]
    
    // Skip common non-workspace subdomains
    if (['www', 'app', 'admin', 'api'].includes(firstPart.toLowerCase())) {
      return null
    }
    
    // Check if it's a Vercel deployment
    if (hostname.includes('vercel.app') && parts.length >= 4) {
      return firstPart
    }
    
    // For custom domains, assume first part is workspace if not www/app
    if (parts.length === 3) {
      return firstPart
    }
  }
  
  return null
}

/**
 * Get workspace URL from multiple sources (priority order):
 * 1. Query parameter (?workspace=...)
 * 2. Subdomain (from hostname)
 * 3. SessionStorage
 */
export function getWorkspaceUrl(): string | null {
  if (typeof window === 'undefined') return null
  
  // Check query parameter first
  const urlParams = new URLSearchParams(window.location.search)
  const workspaceParam = urlParams.get('workspace')
  if (workspaceParam) {
    return workspaceParam
  }
  
  // Check subdomain
  const workspaceFromHost = getWorkspaceFromHostname()
  if (workspaceFromHost) {
    return workspaceFromHost
  }
  
  // Check sessionStorage as fallback
  return sessionStorage.getItem('current_workspace_url')
}

/**
 * Initialize tenant context from workspace URL
 * This should be called on dashboard pages to set up tenant context
 */
export async function initializeTenantFromWorkspace(workspaceUrl: string | null) {
  if (typeof window === 'undefined' || !workspaceUrl) return null
  
  // If already set and matches, return existing
  const currentWorkspace = sessionStorage.getItem('current_workspace_url')
  const currentTenantId = sessionStorage.getItem('current_tenant_id')
  
  if (currentWorkspace === workspaceUrl && currentTenantId) {
    return currentTenantId
  }
  
  // Fetch tenant ID from workspace URL
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, workspace_url, is_active')
      .eq('workspace_url', workspaceUrl.toLowerCase())
      .single()
    
    if (error || !tenant) {
      console.error('Tenant not found for workspace:', workspaceUrl)
      return null
    }
    
    // Check if user is admin - admins can access even when tenant is inactive
    const { data: { user } } = await supabase.auth.getUser()
    let isAdmin = false
    
    if (user) {
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('tenant_id', tenant.id)
        .eq('user_id', user.id)
        .single()
      
      isAdmin = tenantUser?.role === 'admin'
    }
    
    // If tenant is inactive and user is not admin, don't set tenant context
    // (This will be handled by SubscriptionGuard, but we still need to set context for admins)
    if (!tenant.is_active && !isAdmin) {
      console.error('Tenant is inactive and user is not admin:', workspaceUrl)
      return null
    }
    
    // Set tenant context in sessionStorage (even if inactive, for admins)
    sessionStorage.setItem('current_tenant_id', tenant.id)
    sessionStorage.setItem('current_workspace_url', tenant.workspace_url)
    
    return tenant.id
  } catch (error) {
    console.error('Error initializing tenant:', error)
    return null
  }
}

