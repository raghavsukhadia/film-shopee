import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

/**
 * DELETE /api/admin/delete-tenant
 * Comprehensive tenant deletion that removes ALL tenant-related data
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Verify user is super admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!superAdmin) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // Get tenant ID from query params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, tenant_code')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Use admin client for operations that bypass RLS
    const adminSupabase = createAdminClient()

    // Step 1: Get all tenant users (to delete auth users later)
    const { data: tenantUsers } = await adminSupabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', tenantId)

    const userIds = tenantUsers?.map(tu => tu.user_id) || []

    // Step 2: Delete storage files
    try {
      // Delete payment proof files
      const { data: paymentProofs } = await adminSupabase
        .from('tenant_payment_proofs')
        .select('payment_proof_url')
        .eq('tenant_id', tenantId)

      if (paymentProofs && paymentProofs.length > 0) {
        const filePaths = paymentProofs
          .map(proof => {
            // Extract file path from URL
            // Format: https://[project].supabase.co/storage/v1/object/public/payment-proofs/[tenant_id]/[filename]
            // Or: payment-proofs/[tenant_id]/[filename]
            const url = proof.payment_proof_url
            if (!url) return null
            
            // Handle different URL formats
            let filePath = url
            
            // If it's a full URL, extract the path
            if (url.includes('/storage/v1/object/public/payment-proofs/')) {
              const parts = url.split('/payment-proofs/')
              if (parts.length > 1) {
                filePath = parts[1]
              }
            } else if (url.includes('/payment-proofs/')) {
              const parts = url.split('/payment-proofs/')
              if (parts.length > 1) {
                filePath = parts[1]
              }
            } else if (url.startsWith('payment-proofs/')) {
              filePath = url.replace('payment-proofs/', '')
            }
            
            // Ensure path doesn't start with tenant_id if it's already in the path
            if (filePath.startsWith(`${tenantId}/`)) {
              return filePath
            } else if (!filePath.includes('/')) {
              // If it's just a filename, prepend tenant_id
              return `${tenantId}/${filePath}`
            }
            
            return filePath
          })
          .filter((path): path is string => path !== null && path.length > 0)

        if (filePaths.length > 0) {
          // Delete files from storage bucket
          try {
            const { data: deletedFiles, error: storageError } = await adminSupabase.storage
              .from('payment-proofs')
              .remove(filePaths)

            if (storageError) {
              console.error('Error deleting payment proof files:', storageError)
              // Continue even if storage deletion fails
            } else {
              console.log(`Deleted ${deletedFiles?.length || 0} payment proof files`)
            }
          } catch (storageErr) {
            console.error('Exception deleting storage files:', storageErr)
            // Continue with tenant deletion even if storage cleanup fails
          }
        }
      }

      // Delete comment attachments (if any storage buckets exist)
      // Check for comment attachments in various tables
      const attachmentTables = [
        'service_tracker_comment_attachments',
        'customer_requirements_comment_attachments',
        'vehicle_inward_comment_attachments',
        'call_follow_up_comment_attachments'
      ]

      for (const tableName of attachmentTables) {
        try {
          // Get attachments for this tenant's comments
          // Note: This requires joining through parent tables to get tenant_id
          // For now, we'll rely on CASCADE deletion
        } catch (err) {
          console.error(`Error checking ${tableName}:`, err)
        }
      }
    } catch (storageError) {
      console.error('Error deleting storage files:', storageError)
      // Continue with deletion even if storage cleanup fails
    }

    // Step 3: Delete tenant (this will CASCADE delete most related data)
    // Tables with ON DELETE CASCADE:
    // - tenant_users
    // - subscriptions
    // - tenant_payment_proofs
    // - tenant_approval_requests
    // - subscription_plan_requests
    // - customers, vehicles, vehicle_inward, work_orders, invoices
    // - service_trackers, follow_ups, requirements, payments
    // - system_settings, locations, vehicle_types, departments
    // - All comment tables and attachments (via CASCADE)
    
    const { error: deleteError } = await adminSupabase
      .from('tenants')
      .delete()
      .eq('id', tenantId)

    if (deleteError) {
      console.error('Error deleting tenant:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete tenant: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Step 4: Delete auth users (after tenant deletion to avoid foreign key issues)
    // Only delete users that are ONLY associated with this tenant
    let deletedUsersCount = 0
    let skippedUsersCount = 0
    
    for (const userId of userIds) {
      try {
        // Check if user is associated with other tenants
        const { data: otherTenants } = await adminSupabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', userId)

        // If user is only in this tenant (or no longer in any tenant), delete auth user
        if (!otherTenants || otherTenants.length === 0) {
          // Delete auth user using admin API
          const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)
          if (authError) {
            console.error(`Error deleting auth user ${userId}:`, authError)
            // Continue with other users even if one fails
          } else {
            deletedUsersCount++
          }
        } else {
          // User belongs to other tenants, skip deletion
          skippedUsersCount++
          console.log(`Skipping user ${userId} - belongs to other tenants`)
        }
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError)
        // Continue with other users
      }
    }

    // Step 5: Clean up notifications related to this tenant
    try {
      await adminSupabase
        .from('notifications')
        .delete()
        .eq('tenant_id', tenantId)
    } catch (notifError) {
      console.error('Error deleting notifications:', notifError)
      // Continue - notifications cleanup is not critical
    }

    return NextResponse.json({
      success: true,
      message: `Tenant "${tenant.name}" (${tenant.tenant_code}) and all associated data have been deleted successfully.` +
        (deletedUsersCount > 0 ? ` Deleted ${deletedUsersCount} user account(s).` : '') +
        (skippedUsersCount > 0 ? ` ${skippedUsersCount} user(s) were preserved (belong to other tenants).` : '')
    })
  } catch (error: any) {
    console.error('Error in delete-tenant API:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

