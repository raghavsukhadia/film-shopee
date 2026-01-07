import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import archiver from 'archiver'

// Helper function to verify super admin
async function verifySuperAdmin() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized', status: 401, user: null }
  }

  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!superAdmin) {
    return { error: 'Forbidden: Super admin access required', status: 403, user: null }
  }

  return { error: null, status: 200, user }
}

// List of tenant-specific tables to backup
const TENANT_TABLES = [
  'vehicles',
  'customers',
  'vehicle_inward',
  'work_orders',
  'service_trackers',
  'call_follow_up',
  'customer_requirements',
  'invoices',
  'payments',
  'expenses',
  'locations',
  'departments',
  'vehicle_types',
  'subscriptions',
  'tenant_payment_proofs',
  'system_settings',
  'notifications'
]

// POST: Create tenant backup
export async function POST(request: NextRequest) {
  try {
    // Verify super admin
    const authResult = await verifySuperAdmin()
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const { tenant_id } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .select('id, name, tenant_code')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get tenant users to fetch associated profiles
    const { data: tenantUsers } = await adminSupabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', tenant_id)

    const userIds = tenantUsers?.map(tu => tu.user_id) || []

    // Export all tenant-specific tables
    const backupData: Record<string, any[]> = {}
    
    console.log(`Starting backup for tenant: ${tenant.name} (${tenant.tenant_code})`)
    
    for (const table of TENANT_TABLES) {
      try {
        console.log(`Fetching data from ${table}...`)
        let query = adminSupabase
          .from(table)
          .select('*')
          .eq('tenant_id', tenant_id)

        // Special handling for tenant_users - only get users for this tenant
        if (table === 'tenant_users') {
          query = adminSupabase
            .from('tenant_users')
            .select('*')
            .eq('tenant_id', tenant_id)
        }

        const { data, error } = await query

        if (error) {
          console.error(`Error fetching ${table}:`, error)
          backupData[table] = []
        } else {
          backupData[table] = data || []
          console.log(`Fetched ${data?.length || 0} records from ${table}`)
        }
      } catch (err) {
        console.error(`Error processing ${table}:`, err)
        backupData[table] = []
      }
    }
    
    console.log('All tables fetched, creating ZIP archive...')

    // Get profiles for tenant users
    if (userIds.length > 0) {
      try {
        const { data: profiles, error: profilesError } = await adminSupabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        if (!profilesError && profiles) {
          backupData['profiles'] = profiles
        }
      } catch (err) {
        console.error('Error fetching profiles:', err)
        backupData['profiles'] = []
      }
    } else {
      backupData['profiles'] = []
    }

    // Create backup metadata
    const metadata = {
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      tenant_code: tenant.tenant_code,
      backup_date: new Date().toISOString(),
      version: '1.0',
      tables: Object.keys(backupData),
      record_counts: Object.fromEntries(
        Object.entries(backupData).map(([key, value]) => [key, value.length])
      )
    }

    // Create ZIP file
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    // Set up promise to wait for archive completion
    const archivePromise = new Promise<void>((resolve, reject) => {
      archive.on('end', () => {
        resolve()
      })
      archive.on('error', (err) => {
        reject(err)
      })
    })

    // Collect all chunks
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    // Add metadata
    archive.append(JSON.stringify(metadata, null, 2), { name: 'backup_metadata.json' })

    // Add all table data as JSON files
    for (const [tableName, data] of Object.entries(backupData)) {
      archive.append(JSON.stringify(data, null, 2), { name: `${tableName}.json` })
    }

    // Finalize the archive (this will trigger the 'end' event)
    await archive.finalize()

    // Wait for all data to be collected
    await archivePromise

    // Combine chunks into single buffer
    const zipBuffer = Buffer.concat(chunks)
    console.log(`ZIP archive created: ${zipBuffer.length} bytes`)

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `backup_${tenant.tenant_code}_${timestamp}.zip`

    console.log(`Backup completed successfully: ${filename}`)

    // Return ZIP file as response
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString()
      }
    })

  } catch (error: any) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { error: 'Failed to create backup: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

// GET: Download backup (alternative endpoint for direct download)
export async function GET(request: NextRequest) {
  try {
    // Verify super admin
    const authResult = await verifySuperAdmin()
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')
    const timestamp = searchParams.get('timestamp')

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // For now, redirect to POST endpoint to create fresh backup
    // In production, you might want to store backups and retrieve them here
    return NextResponse.json({ 
      error: 'Please use POST endpoint to create backup',
      message: 'Backups are generated on-demand. Use POST /api/admin/backup to create a new backup.'
    }, { status: 400 })

  } catch (error: any) {
    console.error('Error downloading backup:', error)
    return NextResponse.json(
      { error: 'Failed to download backup: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

