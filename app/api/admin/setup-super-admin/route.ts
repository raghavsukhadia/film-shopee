import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// This endpoint should be called once to set up the super admin
// Call it manually or through a script
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Get user by email
    const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json(
        { error: 'Failed to list users', details: listError.message },
        { status: 500 }
      )
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please create the user first.' },
        { status: 404 }
      )
    }

    // Check if already super admin
    const { data: existing } = await adminSupabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { message: 'User is already a super admin', user_id: user.id },
        { status: 200 }
      )
    }

    // Create super admin record
    const { data, error } = await adminSupabase
      .from('super_admins')
      .insert({
        user_id: user.id,
        email: email,
        can_access_all_tenants: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating super admin:', error)
      return NextResponse.json(
        { error: 'Failed to create super admin', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      super_admin: data
    }, { status: 201 })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}

