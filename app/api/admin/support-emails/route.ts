import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET: Fetch support email from Platform Settings
export async function GET(request: Request) {
  try {
    const adminSupabase = createAdminClient()

    // Get support email from platform settings (tenant_id IS NULL for global platform settings)
    const { data: supportEmailSetting, error: settingsError } = await adminSupabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'support_email')
      .is('tenant_id', null) // Platform settings are global
      .maybeSingle()

    if (settingsError) {
      console.error('Error fetching support email from settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch support email', details: settingsError.message },
        { status: 500 }
      )
    }

    // Extract support email from settings
    const emails: string[] = []
    if (supportEmailSetting?.setting_value) {
      const supportEmail = supportEmailSetting.setting_value.trim()
      if (supportEmail && supportEmail.length > 0) {
        emails.push(supportEmail)
      }
    }

    // Fallback: If no support email in settings, try to get super admin emails
    if (emails.length === 0) {
      const { data: superAdmins, error: superAdminError } = await adminSupabase
        .from('super_admins')
        .select(`
          email,
          auth.users!super_admins_user_id_fkey(email, user_metadata)
        `)

      if (!superAdminError && superAdmins) {
        superAdmins.forEach((sa: any) => {
          // Use email from super_admins table or from auth.users
          const email = sa.email || sa.auth?.users?.email
          if (email && !emails.includes(email)) {
            emails.push(email)
          }
        })
      }
    }

    return NextResponse.json({ emails: emails || [] })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}

