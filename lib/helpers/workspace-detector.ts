/**
 * Utility functions to detect workspace URL from subdomain
 * and handle tenant context setup
 */

/**
 * Extract workspace URL from current hostname
 * Examples:
 * - filmshopeezoravofs01.in → filmshopeezoravofs01
 * - filmshopeezoravo.in → null (main domain for admin)
 * - localhost:3000 → null (development)
 * - For Vercel deployments: still support old format
 */
export function getWorkspaceFromHostname(): string | null {
  if (typeof window === 'undefined') return null
  
  const hostname = window.location.hostname
  const parts = hostname.split('.')
  
  // Skip if localhost or IP address
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.startsWith('192.168.')) {
    return null
  }
  
  // New domain format: filmshopeezoravofs01.in (2 parts: domain.tld)
  if (parts.length === 2) {
    const domain = parts[0] // e.g., "filmshopeezoravofs01"
    const tld = parts[1] // e.g., "in"
    
    // Check if it's the new .in domain format
    if (tld === 'in') {
      // Main domain for admin access
      if (domain === 'filmshopeezoravo') {
        return null
      }
      
      // Tenant domain: filmshopeezoravofs01, filmshopeezoravofs02, etc.
      if (domain.startsWith('filmshopeezoravo') && domain.match(/^filmshopeezoravofs\d+$/i)) {
        return domain // Return full domain name as workspace URL
      }
      
      // Legacy support: if domain doesn't match new pattern, return as-is
      // This handles migration period
      return domain
    }
  }
  
  // Legacy support: For Vercel deployments and old subdomain format
  // workspace.project.vercel.app (4 parts) or workspace.domain.com (3 parts)
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
    
    // For custom domains with subdomain format, assume first part is workspace
    if (parts.length === 3) {
      return firstPart
    }
  }
  
  return null
}

/**
 * Get workspace URL or tenant code from multiple sources (priority order):
 * 1. Path parameter (/dashboard/FS01)
 * 2. Query parameter (?workspace=... or ?tenant=...)
 * 3. Subdomain (from hostname)
 * 4. SessionStorage
 */
export function getWorkspaceUrl(): string | null {
  if (typeof window === 'undefined') return null
  
  // Check pathname first - extract tenant code from /dashboard/FS01
  const pathname = window.location.pathname
  const pathMatch = pathname.match(/^\/dashboard\/([^/]+)/)
  if (pathMatch) {
    const tenantCode = pathMatch[1]
    // Validate it looks like a tenant code (FS01, FS02, etc.) or allow UUIDs for backward compatibility
    if (tenantCode && (tenantCode.match(/^FS\d+$/i) || tenantCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
      return tenantCode
    }
  }
  
  // Check query parameters
  const urlParams = new URLSearchParams(window.location.search)
  const workspaceParam = urlParams.get('workspace')
  const tenantParam = urlParams.get('tenant')
  
  // If tenant parameter exists, it could be tenant_code (FS01, FS02, etc.) or UUID
  // We'll handle it in initializeTenantFromWorkspace
  if (tenantParam) {
    return tenantParam
  }
  
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
 * Initialize tenant context from workspace URL or tenant code
 * This should be called on dashboard pages to set up tenant context
 * Supports both workspace_url and tenant_code (FS01, FS02, etc.)
 */
export async function initializeTenantFromWorkspace(workspaceUrl: string | null) {
  if (typeof window === 'undefined' || !workspaceUrl) return null
  
  // If already set and matches, return existing
  const currentWorkspace = sessionStorage.getItem('current_workspace_url')
  const currentTenantId = sessionStorage.getItem('current_tenant_id')
  
  if (currentWorkspace === workspaceUrl && currentTenantId) {
    return currentTenantId
  }
  
  // Fetch tenant ID from workspace URL or tenant code
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    // Check if workspaceUrl looks like a tenant code (FS01, FS02, etc.) or UUID
    const isTenantCode = /^FS\d+$/i.test(workspaceUrl)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceUrl)
    
    let tenantQuery = supabase
      .from('tenants')
      .select('id, name, workspace_url, tenant_code, is_active')
    
    if (isTenantCode) {
      // Lookup by tenant_code
      tenantQuery = tenantQuery.eq('tenant_code', workspaceUrl.toUpperCase()).single()
    } else if (isUUID) {
      // Lookup by ID (backward compatibility)
      tenantQuery = tenantQuery.eq('id', workspaceUrl).single()
    } else {
      // Lookup by workspace_url
      tenantQuery = tenantQuery.eq('workspace_url', workspaceUrl.toLowerCase()).single()
    }
    
    const { data: tenant, error } = await tenantQuery
    
    if (error || !tenant) {
      console.error('Tenant not found for workspace/code:', workspaceUrl)
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

