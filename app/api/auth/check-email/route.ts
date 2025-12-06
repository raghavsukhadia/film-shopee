import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      // Invalid email format - return false for security (don't reveal format issues)
      return NextResponse.json({ exists: false })
    }

    try {
      // First, try to check auth.users directly using admin client (most reliable)
      const adminSupabase = createAdminClient()
      
      // List users and check if email exists
      // Note: Supabase Admin API doesn't have a direct "get user by email" method
      // So we'll use the profiles table as primary check, but with admin client for better reliability
      const { data: users, error: adminError } = await adminSupabase.auth.admin.listUsers()
      
      if (!adminError && users) {
        // Check if email exists in auth.users
        const userExists = users.users.some(user => 
          user.email?.toLowerCase().trim() === normalizedEmail
        )
        
        if (userExists) {
          return NextResponse.json({ exists: true })
        }
      }
    } catch (adminError) {
      // If admin client fails, fall back to profiles table check
      console.warn('Admin client check failed, falling back to profiles table:', adminError)
    }

    // Fallback: Check profiles table using regular client
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (profileError) {
      console.error('Error checking email in profiles:', profileError)
      // If there's an error querying, we'll assume the email doesn't exist for security
      // This prevents email enumeration attacks
      return NextResponse.json({ exists: false })
    }

    // Return true if profile exists, false otherwise
    return NextResponse.json({ exists: !!profile })
  } catch (error: any) {
    console.error('Error in check-email route:', error)
    // On error, return false to be safe (prevents email enumeration)
    return NextResponse.json({ exists: false })
  }
}

