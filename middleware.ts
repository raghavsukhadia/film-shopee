import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Extract subdomain (workspace URL) from hostname
  // Examples:
  // - rs-car-accessories-nagpur.zoravo-oms.vercel.app → workspace: rs-car-accessories-nagpur
  // - zoravo-oms.vercel.app → no workspace (main domain)
  // - localhost:3000 → no workspace (development)
  
  const parts = hostname.split('.')
  let workspaceUrl: string | null = null
  
  // Check if we have a subdomain (more than 2 parts means subdomain exists)
  // For production: workspace.domain.com (3 parts)
  // For Vercel: workspace.project.vercel.app (4 parts)
  // For localhost: localhost:3000 (1 part, no subdomain)
  
  if (parts.length >= 3) {
    // Check if it's not a known domain pattern (like vercel.app, localhost, etc.)
    const knownDomains = ['vercel.app', 'localhost', '127.0.0.1']
    const domainPart = parts.slice(-2).join('.')
    
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
  
  // Create response
  let response: NextResponse
  
  // If workspace URL is detected from subdomain, add it to headers and query params
  if (workspaceUrl && workspaceUrl !== 'www' && workspaceUrl !== 'app') {
    // Add workspace URL to request headers for use in pages
    response = NextResponse.next()
    response.headers.set('x-workspace-url', workspaceUrl)
    
    // If not already in query params, add it
    if (!url.searchParams.has('workspace')) {
      url.searchParams.set('workspace', workspaceUrl)
      response = NextResponse.redirect(url)
    }
  } else {
    response = NextResponse.next()
  }
  
  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.supabase.in",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.vercel.app wss://*.supabase.co wss://*.supabase.in",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
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