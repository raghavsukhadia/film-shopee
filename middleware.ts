import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Extract workspace URL from hostname
  // Examples:
  // - filmshopeezoravofs01.in → workspace: filmshopeezoravofs01
  // - filmshopeezoravo.in → no workspace (main domain for admin)
  // - localhost:3000 → no workspace (development)
  // - Legacy: rs-car-accessories-nagpur.zoravo-oms.vercel.app → workspace: rs-car-accessories-nagpur
  
  const parts = hostname.split('.')
  let workspaceUrl: string | null = null
  
  // New domain format: filmshopeezoravofs01.in (2 parts: domain.tld)
  if (parts.length === 2) {
    const domain = parts[0] // e.g., "filmshopeezoravofs01"
    const tld = parts[1] // e.g., "in"
    
    // Check if it's the new .in domain format
    if (tld === 'in') {
      // Main domain for admin access - no workspace
      if (domain === 'filmshopeezoravo') {
        workspaceUrl = null
      }
      // Tenant domain: filmshopeezoravofs01, filmshopeezoravofs02, etc.
      else if (domain.startsWith('filmshopeezoravo') && domain.match(/^filmshopeezoravofs\d+$/i)) {
        workspaceUrl = domain // Return full domain name as workspace URL
      }
      // Legacy support: if domain doesn't match new pattern, return as-is
      else {
        workspaceUrl = domain
      }
    }
  }
  // Legacy support: For Vercel deployments and old subdomain format
  // workspace.domain.com (3 parts) or workspace.project.vercel.app (4 parts)
  else if (parts.length >= 3) {
    // Check if it's not a known domain pattern (like vercel.app, localhost, etc.)
    const knownDomains = ['vercel.app', 'localhost', '127.0.0.1']
    
    if (!knownDomains.some(d => hostname.includes(d))) {
      // Custom domain or subdomain pattern
      workspaceUrl = parts[0]
    } else if (parts.length >= 4) {
      // Vercel pattern: workspace.project.vercel.app
      workspaceUrl = parts[0]
    }
  }
  
  // Skip workspace detection for admin routes, API routes, and static files
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/favicon.ico') ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next()
  }
  
  // If workspace URL is detected from subdomain, add it to headers and query params
  if (workspaceUrl && workspaceUrl !== 'www' && workspaceUrl !== 'app') {
    // Add workspace URL to request headers for use in pages
    const response = NextResponse.next()
    response.headers.set('x-workspace-url', workspaceUrl)
    
    // If not already in query params, add it
    if (!url.searchParams.has('workspace')) {
      url.searchParams.set('workspace', workspaceUrl)
      return NextResponse.redirect(url)
    }
    
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (webpack hot module replacement)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}