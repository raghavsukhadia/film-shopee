import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

// Server client with cookie support for API routes
export function createClient(cookieStore?: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : []
        },
        setAll(cookiesToSet) {
          // In API routes, we can't set cookies in the response directly
          // But we can read them for authentication
          if (cookieStore) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Note: In API routes, setting cookies requires using NextResponse
              // This is a read-only implementation for authentication
            })
          }
        },
      },
    }
  )
}
